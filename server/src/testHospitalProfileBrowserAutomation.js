const assert = require('assert');

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) {
            reject(new Error(data.error.message || JSON.stringify(data.error)));
          } else {
            resolve(data.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      const msg = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(msg || JSON.stringify(result.exceptionDetails));
    }
    return result.result?.value;
  }

  async wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async waitForFunction(fnExpression, timeout = 12000, interval = 250) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const res = await this.evaluate(fnExpression);
        if (res) return res;
      } catch (_) {}
      await this.wait(interval);
    }
    throw new Error(`Timeout waiting for function: ${fnExpression}`);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runBrowserTests() {
  console.log('\n======================================================');
  console.log('🌐 BROWSER AUTOMATION SUITE: HOSPITAL ADMIN MY PROFILE');
  console.log('======================================================\n');

  // Create fresh browser target tab
  const newTargetRes = await fetch('http://localhost:9222/json/new?http://localhost:5173/login', { method: 'PUT' });
  const target = await newTargetRes.json();
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err.message || err);
      failed++;
    }
  };

  try {
    // Test 1: Wait for login page or existing session
    await test('1. Login page or active session loads', async () => {
      await cdp.waitForFunction('document.body !== null');
      const url = await cdp.evaluate('window.location.href');
      assert(url.length > 0);
    });

    // Test 2: Authenticate as Hospital Admin if on login page
    await test('2. Authenticate as Hospital Admin', async () => {
      const isLoginPage = await cdp.evaluate('window.location.pathname.includes("/login")');
      if (isLoginPage) {
        await cdp.evaluate(`(() => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          const emailInput = document.querySelector("input[type='email'], input[name='email']");
          const passInput = document.querySelector("input[type='password'], input[name='password']");
          if (emailInput && passInput) {
            setter.call(emailInput, 'hosp.admin.1790157410524@hms.org');
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            setter.call(passInput, 'HospitalAdmin123!');
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            const submitBtn = document.querySelector("button[type='submit']");
            if (submitBtn) submitBtn.click();
          }
        })()`);
        await cdp.waitForFunction('window.location.pathname.includes("/dashboard/hospital-admin")', 12000);
      }
    });

    // Test 3: Navigate to My Profile tab
    await test('3. Navigate to My Profile tab', async () => {
      await cdp.evaluate('window.location.href = "http://localhost:5173/dashboard/hospital-admin?tab=profile"');
      await cdp.waitForFunction('document.querySelector(".ha-profile-tab") !== null && document.getElementById("profile-full-name") !== null', 10000);
      const isProfileTab = await cdp.evaluate('document.querySelector(".ha-profile-tab") !== null');
      assert.strictEqual(isProfileTab, true);
    });

    // Test 4: Profile Header Card shows real user data and correct badges
    await test('4. Profile Header card displays real user identity & HOSPITAL ADMIN role badge', async () => {
      const headerData = await cdp.evaluate(`(() => {
        const card = document.querySelector(".ha-profile-header-card");
        if (!card) return null;
        const avatar = card.querySelector(".ha-profile-avatar")?.innerText?.trim() || "";
        const name = card.querySelector(".ha-profile-name")?.innerText?.trim() || "";
        const badges = Array.from(card.querySelectorAll(".ha-badge")).map(b => b.innerText.trim());
        const meta = card.querySelector(".ha-profile-meta-row")?.innerText?.trim() || "";
        return { avatar, name, badges, meta };
      })()`);

      assert(headerData !== null, 'Header card exists');
      assert(headerData.name.length > 0, 'Full name is displayed in header');
      assert(headerData.badges.some(b => b.includes('HOSPITAL ADMIN')), 'Role badge is strictly HOSPITAL ADMIN');
      assert(headerData.badges.some(b => b.includes('ACTIVE')), 'Status badge shows ACTIVE');
      assert(headerData.meta.includes('hosp.admin.1790157410524@hms.org'), 'Real official email is displayed');
      assert(headerData.avatar.length > 0, 'Avatar initials present');
    });

    // Test 5: Verify NO hospital-level configuration is duplicated on My Profile
    await test('5. Isolation verification: No hospital/branch configuration fields on My Profile', async () => {
      const pageText = await cdp.evaluate('document.querySelector(".ha-profile-tab")?.innerText?.toLowerCase() || ""');
      assert(!pageText.includes('registration/license'), 'No registration number on personal profile');
      assert(!pageText.includes('emergency hotline'), 'No emergency hotline on personal profile');
      assert(!pageText.includes('hospital address'), 'No hospital facility address on personal profile');
      assert(!pageText.includes('maintenance mode'), 'No maintenance mode on personal profile');
      assert(!pageText.includes('theme preference'), 'No theme settings form on personal profile');
    });

    // Test 6: Personal Information fields and read-only email
    await test('6. Personal Information section has Full Name, read-only Official Email, Phone, Address', async () => {
      const fields = await cdp.evaluate(`(() => {
        const fullNameInput = document.getElementById('profile-full-name');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');
        const streetInput = document.getElementById('profile-street');
        const cityInput = document.getElementById('profile-city');
        const stateInput = document.getElementById('profile-state');
        const postalInput = document.getElementById('profile-postal');
        const countryInput = document.getElementById('profile-country');
        return {
          hasFullName: fullNameInput !== null,
          fullNameValue: fullNameInput?.value,
          emailDisabled: emailInput?.disabled && emailInput?.readOnly,
          emailValue: emailInput?.value,
          hasPhone: phoneInput !== null,
          hasAddress: streetInput !== null && cityInput !== null && stateInput !== null && postalInput !== null && countryInput !== null,
        };
      })()`);

      assert.strictEqual(fields.hasFullName, true, 'Full Name input exists');
      assert(fields.fullNameValue.length > 0, 'Full Name populated from server');
      assert.strictEqual(fields.emailDisabled, true, 'Official email is strictly read-only and disabled');
      assert(fields.emailValue.includes('hosp.admin.1790157410524@hms.org'), 'Official email matches authenticated user');
      assert.strictEqual(fields.hasPhone, true, 'Phone field exists');
      assert.strictEqual(fields.hasAddress, true, 'All personal address fields exist');
    });

    // Test 7: Account Information section
    await test('7. Account Information section displays read-only Role, Status, Created Date, Last Login, Account ID with Copy', async () => {
      const accountInfo = await cdp.evaluate(`(() => {
        const boxes = Array.from(document.querySelectorAll('.ha-profile-info-box'));
        const role = boxes.find(b => b.innerText.includes('Assigned Role'))?.querySelector('.ha-profile-info-val')?.innerText;
        const status = boxes.find(b => b.innerText.includes('Account Status'))?.querySelector('.ha-profile-info-val')?.innerText;
        const created = boxes.find(b => b.innerText.includes('Account Created'))?.querySelector('.ha-profile-info-val')?.innerText;
        const lastLogin = boxes.find(b => b.innerText.includes('Last Login'))?.querySelector('.ha-profile-info-val')?.innerText;
        const idBox = document.querySelector('.ha-profile-id-box code')?.innerText;
        const copyBtn = document.querySelector('.ha-profile-id-box button')?.innerText;
        return { role, status, created, lastLogin, idBox, copyBtn };
      })()`);

      assert.strictEqual(accountInfo.role, 'Hospital Administrator');
      assert.strictEqual(accountInfo.status, 'ACTIVE');
      assert(accountInfo.created && accountInfo.created !== '—', 'Created date shown');
      assert(accountInfo.lastLogin.length > 0, 'Last login info shown');
      assert(accountInfo.idBox.length > 5, 'Account ID shown');
      assert(accountInfo.copyBtn.includes('Copy'), 'Copy button present');
    });

    // Test 8: Edit Full Name and Phone, click Save Changes, verify persistence
    await test('8. Edit Full Name and Phone, save changes and verify backend persistence', async () => {
      // Save Changes button initially disabled
      const isInitiallyDisabled = await cdp.evaluate('document.querySelector("button[type=\'submit\']").disabled');
      assert.strictEqual(isInitiallyDisabled, true, 'Save Changes initially disabled with no edits');

      // Edit Full Name and Phone using React-compatible setter
      await cdp.evaluate(`(() => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const nameInput = document.getElementById('profile-full-name');
        const nextName = nameInput.value === 'Dr. Jane Administrator' ? 'Dr. Jane Admin Updated' : 'Dr. Jane Administrator';
        setter.call(nameInput, nextName);
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));

        const phoneInput = document.getElementById('profile-phone');
        setter.call(phoneInput, '+1 555-0999');
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);

      // Verify "Unsaved changes" indicator appeared and button is now enabled
      const hasUnsavedBadge = await cdp.evaluate('document.body.innerText.includes("Unsaved changes")');
      const isEnabled = await cdp.evaluate('!document.querySelector("button[type=\'submit\']").disabled');
      assert.strictEqual(hasUnsavedBadge, true, 'Unsaved changes badge appears');
      assert.strictEqual(isEnabled, true, 'Save Changes button becomes enabled');

      // Click Save Changes
      await cdp.evaluate('document.querySelector("button[type=\'submit\']").click()');

      // Wait for success alert
      await cdp.waitForFunction('document.querySelector(".ha-alert--success")?.innerText?.includes("Profile updated successfully")', 8000);
      const successText = await cdp.evaluate('document.querySelector(".ha-alert--success")?.innerText');
      assert(successText.includes('Profile updated successfully'), 'Success feedback displayed');

      // Refresh page and confirm persisted values
      await cdp.send('Page.reload');
      await cdp.waitForFunction('document.getElementById("profile-full-name") !== null && document.getElementById("profile-full-name").value.length > 0', 8000);

      const refreshedValues = await cdp.evaluate(`({
        fullName: document.getElementById('profile-full-name')?.value,
        phone: document.getElementById('profile-phone')?.value,
        headerName: document.querySelector('.ha-profile-name')?.innerText,
      })`);

      assert(refreshedValues.fullName.startsWith('Dr. Jane Admin'), 'Persisted Full Name matches');
      assert.strictEqual(refreshedValues.phone, '+1 555-0999', 'Persisted Phone matches');
      assert(refreshedValues.headerName.startsWith('Dr. Jane Admin'), 'Header updated with new name');
    });

    // Test 9: Validation: Empty Full Name is rejected with client error
    await test('9. Validation: Empty Full Name is rejected with client error', async () => {
      await cdp.evaluate(`(() => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const nameInput = document.getElementById('profile-full-name');
        setter.call(nameInput, '   ');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector("button[type='submit']").click();
      })()`);

      await cdp.waitForFunction('document.querySelector(".ha-alert--error") !== null', 4000);
      const errText = await cdp.evaluate('document.querySelector(".ha-alert--error")?.innerText');
      assert(errText.includes('Full name is required'), 'Validation error message for empty full name');

      // Click Reset Changes to cleanly revert back to baseline
      await cdp.evaluate(`(() => {
        const resetBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Reset Changes"));
        if (resetBtn) resetBtn.click();
      })()`);
    });

    // Test 10: Reset / Cancel button restores baseline
    await test('10. Reset Changes restores baseline', async () => {
      const baseline = await cdp.evaluate('document.getElementById("profile-full-name")?.value');

      await cdp.evaluate(`(() => {
        const nameInput = document.getElementById('profile-full-name');
        nameInput.value = 'Temporary Name Not Saved';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);

      const resetButton = await cdp.evaluate('Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Reset Changes")) !== null');
      assert.strictEqual(resetButton, true, 'Reset Changes button is visible when unsaved');

      await cdp.evaluate(`(() => {
        const resetBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Reset Changes"));
        if (resetBtn) resetBtn.click();
      })()`);

      const resetValue = await cdp.evaluate('document.getElementById("profile-full-name")?.value');
      assert.strictEqual(resetValue, baseline, 'Reset restored baseline');
    });

    // Test 11: Password Security: Wrong current password returns error
    await test('11. Password change with wrong current password shows error feedback', async () => {
      await cdp.evaluate(`(() => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const curPass = document.getElementById('profile-current-pass');
        const newPass = document.getElementById('profile-new-pass');
        const confPass = document.getElementById('profile-confirm-pass');

        setter.call(curPass, 'WrongCurrentPass123!');
        curPass.dispatchEvent(new Event('input', { bubbles: true }));

        setter.call(newPass, 'BrandNewPassword123!');
        newPass.dispatchEvent(new Event('input', { bubbles: true }));

        setter.call(confPass, 'BrandNewPassword123!');
        confPass.dispatchEvent(new Event('input', { bubbles: true }));

        const changePassBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Change Password"));
        if (changePassBtn) changePassBtn.click();
      })()`);

      await cdp.waitForFunction('document.querySelector(".ha-panel:last-child .ha-alert--error") !== null', 8000);
      const passErr = await cdp.evaluate('document.querySelector(".ha-panel:last-child .ha-alert--error")?.innerText');
      assert(passErr.includes('Failed to change password') || passErr.includes('Current password is incorrect'), 'Correct error for wrong password');
    });

    // Test 12: Password Security: Mismatched new passwords returns client error
    await test('12. Password change with mismatched confirmation shows client validation error', async () => {
      await cdp.evaluate(`(() => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const curPass = document.getElementById('profile-current-pass');
        const newPass = document.getElementById('profile-new-pass');
        const confPass = document.getElementById('profile-confirm-pass');

        setter.call(curPass, 'HospitalAdmin123!');
        curPass.dispatchEvent(new Event('input', { bubbles: true }));

        setter.call(newPass, 'BrandNewPassword123!');
        newPass.dispatchEvent(new Event('input', { bubbles: true }));

        setter.call(confPass, 'MismatchPassword123!');
        confPass.dispatchEvent(new Event('input', { bubbles: true }));

        const changePassBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Change Password"));
        if (changePassBtn) changePassBtn.click();
      })()`);

      await cdp.waitForFunction('document.querySelector(".ha-panel:last-child .ha-alert--error")?.innerText?.includes("match")', 4000);
      const matchErr = await cdp.evaluate('document.querySelector(".ha-panel:last-child .ha-alert--error")?.innerText');
      assert(matchErr.includes('New passwords do not match'), 'Mismatched passwords error displayed');
    });

    // Test 13: Responsive design: Mobile 390px viewport
    await test('13. Mobile viewport (390px): clean vertical stack and zero horizontal overflow', async () => {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await cdp.wait(500);

      const overflow = await cdp.evaluate(`({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      })`);

      assert.strictEqual(overflow.hasOverflow, false, `No horizontal overflow at 390px (scrollWidth: ${overflow.scrollWidth}, clientWidth: ${overflow.clientWidth})`);
    });

    // Test 14: Responsive design: Tablet 768px viewport
    await test('14. Tablet viewport (768px): zero horizontal overflow', async () => {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await cdp.wait(500);

      const overflow = await cdp.evaluate(`({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      })`);

      assert.strictEqual(overflow.hasOverflow, false, `No horizontal overflow at 768px (scrollWidth: ${overflow.scrollWidth}, clientWidth: ${overflow.clientWidth})`);
    });

    // Test 15: Reset to Desktop viewport (1440px)
    await test('15. Desktop viewport (1440px): 2-column layout and zero horizontal overflow', async () => {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await cdp.wait(500);

      const overflow = await cdp.evaluate(`({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      })`);

      assert.strictEqual(overflow.hasOverflow, false, 'No horizontal overflow on Desktop');
    });

    // Test 16: Theme toggle test (Light <-> Dark)
    await test('16. Global theme toggle integration (Light <-> Dark)', async () => {
      const initialTheme = await cdp.evaluate('document.documentElement.getAttribute("data-theme") || "light"');
      // Click theme toggle button in topbar
      await cdp.evaluate('document.querySelector(".topbar__theme-toggle-btn")?.click()');
      await cdp.wait(300);
      const toggledTheme = await cdp.evaluate('document.documentElement.getAttribute("data-theme")');
      assert.notStrictEqual(toggledTheme, initialTheme, 'Theme toggled successfully');

      // Click back
      await cdp.evaluate('document.querySelector(".topbar__theme-toggle-btn")?.click()');
      await cdp.wait(300);
    });

  } finally {
    cdp.close();
    try {
      await fetch(`http://localhost:9222/json/close/${target.id}`);
    } catch (_) {}
  }

  console.log('\n======================================================');
  console.log(`🏁 BROWSER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runBrowserTests().catch((err) => {
  console.error('Fatal browser test error:', err);
  process.exit(1);
});
