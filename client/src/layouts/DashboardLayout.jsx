/**
 * Dashboard Layout
 * 
 * Main application layout with role-adaptive sidebar navigation and top bar.
 * Renders active role page via React Router Outlet.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ROLE_NAVIGATION, normalizeRoleKey } from '../pages/dashboards/roleNavigation';
import { patientService } from '../services/patient.service';
import { receptionService } from '../services/reception.service';
import { pharmacyService } from '../services/pharmacy.service';
import { labService } from '../services/lab.service';
import { radiologyService } from '../services/radiology.service';
import { hospitalAdminService } from '../services/hospitalAdmin.service';
import { superadminService } from '../services/superadmin.service';
import { doctorService } from '../services/doctor.service';
import { useTheme } from '../context/useTheme';

import {
  LayoutDashboard,
  Heart,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Settings,
  Sun,
  Moon,
  Pill,
  Package,
  AlertTriangle,
  Clock,
  CreditCard,
  ArrowRight,
  CheckCheck,
  Building2,
  ShieldCheck,
} from 'lucide-react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationIcon(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('secur') || c.includes('role') || c.includes('perm')) return <ShieldCheck size={16} />;
  if (c.includes('hosp')) return <Building2 size={16} />;
  if (c.includes('prescript')) return <Pill size={16} />;
  if (c.includes('low') || c.includes('alert') || c.includes('warn')) return <AlertTriangle size={16} />;
  if (c.includes('expir') || c.includes('batch')) return <Clock size={16} />;
  if (c.includes('bill') || c.includes('sale') || c.includes('payment')) return <CreditCard size={16} />;
  if (c.includes('invent') || c.includes('stock') || c.includes('order')) return <Package size={16} />;
  return <Bell size={16} />;
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification Popover State
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const handleToggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  const roleKey = normalizeRoleKey(user?.role);
  const currentRoleNav = ROLE_NAVIGATION[roleKey] || ROLE_NAVIGATION.patient;

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'dashboard';

  // Load notifications for dropdown popover
  const loadNotificationsList = useCallback(() => {
    setLoadingNotifs(true);
    if (roleKey === 'pharmacist') {
      pharmacyService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'receptionist') {
      receptionService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'patient') {
      patientService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'lab_technician') {
      labService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'radiology_staff') {
      radiologyService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'hospital_admin') {
      hospitalAdminService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data?.data?.notifications)
            ? res.data.data.notifications
            : (Array.isArray(res.data) ? res.data : []);
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = res.data?.data?.unreadCount ?? normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'super_admin') {
      superadminService.getNotifications({ limit: 15 })
        .then((res) => {
          const list = Array.isArray(res.data?.data?.notifications)
            ? res.data.data.notifications
            : (Array.isArray(res.data?.notifications) ? res.data.notifications : (Array.isArray(res.data) ? res.data : []));
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = res.data?.data?.unreadCount ?? res.data?.unreadCount ?? normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else if (roleKey === 'doctor') {
      doctorService.getNotifications()
        .then((res) => {
          const list = Array.isArray(res.data?.data?.notifications)
            ? res.data.data.notifications
            : (Array.isArray(res.data?.notifications) ? res.data.notifications : (Array.isArray(res.data) ? res.data : []));
          const normalized = list.map((n) => ({
            ...n,
            id: n.id || n._id,
            read: n.isRead ?? n.read ?? false,
            isRead: n.isRead ?? n.read ?? false,
          }));
          setNotificationsList(normalized);
          const count = res.data?.data?.unreadCount ?? res.data?.unreadCount ?? normalized.filter((n) => !n.read && !n.isRead).length;
          setUnreadCount(count);
        })
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    } else {
      setLoadingNotifs(false);
    }
  }, [roleKey]);


  const toggleNotificationDropdown = () => {
    if (!notifDropdownOpen) {
      loadNotificationsList();
    }
    setNotifDropdownOpen((prev) => !prev);
  };

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotifDropdownOpen(false);
      }
    };
    if (notifDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifDropdownOpen]);

  const handleMarkAllRead = async () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: 0 } }));
    try {
      if (roleKey === 'pharmacist') {
        await pharmacyService.markAllNotificationsRead();
      } else if (roleKey === 'receptionist') {
        await receptionService.markAllNotificationsRead();
      } else if (roleKey === 'patient') {
        await patientService.markAllNotificationsRead();
      } else if (roleKey === 'lab_technician') {
        await labService.markAllNotificationsRead();
      } else if (roleKey === 'radiology_staff') {
        await radiologyService.markAllNotificationsRead();
      } else if (roleKey === 'hospital_admin') {
        await hospitalAdminService.markAllNotificationsRead();
      } else if (roleKey === 'super_admin') {
        await superadminService.markAllNotificationsRead();
      }
    } catch (err) {
      console.warn('Backend markAllNotificationsRead error:', err);
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.isRead && !item.read) {
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('hms:notification-update', { detail: { count: Math.max(0, unreadCount - 1) } }));
      try {
        if (roleKey === 'pharmacist') {
          await pharmacyService.markNotificationRead(item.id);
        } else if (roleKey === 'receptionist') {
          await receptionService.markNotificationRead(item.id);
        } else if (roleKey === 'patient') {
          await patientService.markNotificationRead(item.id);
        } else if (roleKey === 'lab_technician') {
          await labService.markNotificationRead(item.id);
        } else if (roleKey === 'radiology_staff') {
          await radiologyService.markNotificationRead(item.id);
        } else if (roleKey === 'hospital_admin') {
          await hospitalAdminService.markNotificationRead(item.id);
        } else if (roleKey === 'super_admin') {
          await superadminService.markNotificationRead(item.id);
        }
      } catch (err) {
        console.warn('Backend markNotificationRead error:', err);
      }
    }


    setNotifDropdownOpen(false);

    if (roleKey === 'super_admin') {
      if (item.link) {
        navigate(item.link);
      } else {
        navigate(`${currentRoleNav.basePath}?tab=notifications`);
      }
      return;
    }

    // Optional navigation to the relevant tab
    const cat = (item.category || item.type || '').toLowerCase();
    if (roleKey === 'pharmacist') {
      if (cat.includes('prescript')) {
        navigate(`${currentRoleNav.basePath}?tab=prescriptions`);
      } else if (cat.includes('dispens')) {
        navigate(`${currentRoleNav.basePath}?tab=dispensing`);
      } else if (cat.includes('low') || cat.includes('stock')) {
        navigate(`${currentRoleNav.basePath}?tab=low-stock`);
      } else if (cat.includes('expir') || cat.includes('batch')) {
        navigate(`${currentRoleNav.basePath}?tab=batches`);
      } else if (cat.includes('bill') || cat.includes('sale')) {
        navigate(`${currentRoleNav.basePath}?tab=billing`);
      } else if (item.targetTab) {
        navigate(`${currentRoleNav.basePath}?tab=${item.targetTab}`);
      }
    } else if (roleKey === 'radiology_staff') {
      if (cat.includes('critical') || cat.includes('abnormal')) {
        navigate(`${currentRoleNav.basePath}?tab=critical`);
      } else if (cat.includes('schedul')) {
        navigate(`${currentRoleNav.basePath}?tab=scheduling`);
      } else if (cat.includes('queue') || cat.includes('order') || cat.includes('request')) {
        navigate(`${currentRoleNav.basePath}?tab=queue`);
      } else if (cat.includes('verif')) {
        navigate(`${currentRoleNav.basePath}?tab=verification`);
      } else if (cat.includes('report')) {
        navigate(`${currentRoleNav.basePath}?tab=reports`);
      } else if (item.targetTab) {
        navigate(`${currentRoleNav.basePath}?tab=${item.targetTab}`);
      }
    }
  };

  // Fetch unread notifications count
  useEffect(() => {
    let isMounted = true;
    if (roleKey === 'patient') {
      patientService.getNotifications()
        .then((res) => {
          if (isMounted && res.data) {
            const count = res.data.filter((n) => !n.isRead).length;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    } else if (roleKey === 'receptionist') {
      receptionService.getNotifications()
        .then((res) => {
          if (isMounted && res.data) {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    } else if (roleKey === 'pharmacist') {
      pharmacyService.getNotifications()
        .then((res) => {
          if (isMounted && res.data) {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    } else if (roleKey === 'lab_technician') {
      labService.getNotifications()
        .then((res) => {
          if (isMounted && res.data) {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    } else if (roleKey === 'radiology_staff') {
      radiologyService.getNotifications()
        .then((res) => {
          if (isMounted && res.data) {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    } else if (roleKey === 'super_admin') {
      superadminService.getUnreadNotificationCount()
        .then((res) => {
          if (isMounted) {
            const count = res.data?.data?.unreadCount ?? res.data?.unreadCount ?? 0;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    } else if (roleKey === 'hospital_admin') {
      hospitalAdminService.getNotifications()
        .then((res) => {
          if (isMounted) {
            const count = res.data?.data?.unreadCount ?? 0;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [roleKey, currentTab]);

  // Real-time synchronization listener for notifications
  useEffect(() => {
    const handleNotifUpdate = (e) => {
      if (typeof e.detail?.count === 'number') {
        setUnreadCount(e.detail.count);
      } else if (roleKey === 'hospital_admin') {
        hospitalAdminService.getNotifications()
          .then((res) => {
            const count = res.data?.data?.unreadCount ?? 0;
            setUnreadCount(count);
          })
          .catch(() => {});
      } else if (roleKey === 'receptionist') {
        receptionService.getNotifications()
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          })
          .catch(() => {});
      } else if (roleKey === 'pharmacist') {
        pharmacyService.getNotifications()
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          })
          .catch(() => {});
      } else if (roleKey === 'lab_technician') {
        labService.getNotifications()
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          })
          .catch(() => {});
      } else if (roleKey === 'radiology_staff') {
        radiologyService.getNotifications()
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : (res.data.notifications || []);
            const count = typeof res.meta?.unreadCount === 'number'
              ? res.meta.unreadCount
              : list.filter((n) => !n.isRead && !n.read).length;
            setUnreadCount(count);
          })
          .catch(() => {});
      } else if (roleKey === 'super_admin') {
        superadminService.getUnreadNotificationCount()
          .then((res) => {
            const count = res.data?.data?.unreadCount ?? res.data?.unreadCount ?? 0;
            setUnreadCount(count);
          })
          .catch(() => {});
      }
    };
    window.addEventListener('hms:notification-update', handleNotifUpdate);
    return () => window.removeEventListener('hms:notification-update', handleNotifUpdate);
  }, [roleKey]);


  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const isInternalSettings = roleKey === 'super_admin';

  // Active navigation item details for breadcrumbs
  const activeNavItem = (location.pathname === '/dashboard/settings' && !isInternalSettings)
    ? { id: 'settings', label: 'Settings', icon: Settings }
    : currentRoleNav?.items?.find((item) => item.id === currentTab) || currentRoleNav?.items?.[0] || { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard };


  const renderNavItem = (item) => {
    const Icon = item.icon;

    if (item.id === 'logout') {
      return (
        <button
          key={item.id}
          type="button"
          className="sidebar__link sidebar__link--logout"
          onClick={() => {
            closeSidebar();
            handleLogout();
          }}
          title="Sign out of your account"
        >
          <Icon size={18} className="sidebar__link-icon" />
          <span className="sidebar__link-text">{item.label}</span>
        </button>
      );
    }

    const targetUrl = item.id === 'dashboard'
      ? currentRoleNav.basePath
      : (item.id === 'settings' && !isInternalSettings)
        ? '/dashboard/settings'
        : `${currentRoleNav.basePath}?tab=${item.id}`;
    const isSettingsPath = location.pathname === '/dashboard/settings';
    const isActive =
      (isSettingsPath && item.id === 'settings') ||
      (!isSettingsPath && location.pathname === currentRoleNav.basePath && currentTab === item.id);

    return (
      <Link
        key={item.id}
        to={targetUrl}
        className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
        onClick={closeSidebar}
      >
        <Icon size={18} className="sidebar__link-icon" />
        <span className="sidebar__link-text">{item.label}</span>
        {item.id === 'notifications' && unreadCount > 0 && (
          <span className="sidebar__link-badge">{unreadCount}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="dashboard-layout__overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-layout__sidebar ${roleKey === 'super_admin' ? 'dashboard-layout__sidebar--superadmin' : ''} ${sidebarOpen ? 'dashboard-layout__sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <Link to={currentRoleNav.basePath} className="sidebar__brand" onClick={closeSidebar}>
            <div className="sidebar__brand-icon">
              <Heart size={20} strokeWidth={2.5} />
            </div>
            <div className="sidebar__brand-text-wrap">
              <span className="sidebar__brand-text">HMS</span>
              <span className="sidebar__brand-sub">
                {roleKey === 'super_admin' ? 'SUPER ADMIN PORTAL' :
                  roleKey === 'hospital_admin' ? 'HOSPITAL ADMIN PORTAL' :
                  (currentRoleNav.portalName || 'Patient Portal')}
              </span>
              <span className="sidebar__brand-badge">
                {roleKey === 'super_admin' ? 'SUPER ADMIN' :
                  roleKey === 'hospital_admin' ? 'HOSPITAL ADMIN' :
                  roleKey === 'nurse' ? 'NURSING CARE' :
                  roleKey === 'receptionist' ? 'RECEPTION' :
                  roleKey === 'pharmacist' ? 'PHARMACY' :
                  roleKey === 'doctor' ? 'DOCTOR' :
                  roleKey === 'patient' ? 'PATIENT' :
                  (typeof user?.role === 'string' ? user.role : (user?.roleName || 'PORTAL')).replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </Link>
          <button
            className="sidebar__close"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar__nav">
          {currentRoleNav.sections ? (
            currentRoleNav.sections.map((section, sIdx) => (
              <div
                key={section.title || sIdx}
                className={`sidebar__section-group ${sIdx > 0 ? 'sidebar__section-group--bordered' : ''}`}
              >
                <div className="sidebar__section-title">
                  {section.title}
                </div>
                {section.items.map((item) => renderNavItem(item))}
              </div>
            ))
          ) : (
            <>
              <div className="sidebar__section-title">
                {roleKey === 'super_admin' ? 'Global Administration' : (currentRoleNav.portalName || 'Portal Navigation')}
              </div>
              {currentRoleNav.items.map((item) => renderNavItem(item))}
            </>
          )}
        </nav>

        {/* Sidebar Footer with Profile, HMS v1.0.0, and Logout */}
        <div className="sidebar__footer">
          {/* User Profile Mini-Card */}
          <div className="sidebar__user-card">
            <div className="sidebar__user-avatar">
              <User size={15} />
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">
                {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || (roleKey === 'super_admin' ? 'Super Administrator' : 'User')}
              </span>
              <span className="sidebar__user-email">{user?.email}</span>
              <span className="sidebar__user-role-badge">
                {roleKey === 'super_admin' ? 'SUPER ADMIN' :
                  roleKey === 'hospital_admin' ? 'HOSPITAL ADMIN' :
                  roleKey === 'nurse' ? 'NURSING STATION' :
                  roleKey === 'receptionist' ? 'RECEPTION DESK' :
                  roleKey === 'pharmacist' ? 'PHARMACY STAFF' :
                  roleKey === 'doctor' ? 'ATTENDING DOCTOR' :
                  roleKey === 'patient' ? 'PATIENT' :
                  (typeof user?.role === 'string' ? user.role : (user?.roleName || 'USER')).replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>

          <div className="sidebar__footer-meta">
            <span className="sidebar__version">HMS v1.0.0</span>
            <span className="sidebar__system-status">
              <span className="sidebar__status-dot" /> Online
            </span>
          </div>

          {!['super_admin', 'hospital_admin'].includes(roleKey) && (
            <button
              className="sidebar__logout-btn"
              onClick={handleLogout}
              title="Sign out of your account"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="dashboard-layout__main">
        {/* Top bar */}
        <header className="dashboard-layout__topbar">
          <button
            className="topbar__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>

          {/* Breadcrumb Hierarchy */}
          <div className="topbar__breadcrumbs">
            <span className="topbar__breadcrumb-root">
              {roleKey === 'super_admin' ? 'Super Admin' : (currentRoleNav.portalName || 'Hospital Portal')}
            </span>
            <span className="topbar__breadcrumb-sep">/</span>
            {location.pathname === '/dashboard/settings' ? (
              <span className="topbar__breadcrumb-current" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Application Settings
              </span>
            ) : (
              <span className="topbar__breadcrumb-current" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeNavItem?.label || 'Dashboard'}
              </span>
            )}
          </div>

          <div className="topbar__spacer" />

          {/* Topbar Right Controls: [Theme Toggle] [Notification Bell] */}
          <div className="topbar__actions">
            {/* Quick Theme Toggle (Light <-> Dark) */}
            <button
              type="button"
              className="topbar__icon-btn topbar__theme-toggle-btn"
              onClick={handleToggleTheme}
              title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {effectiveTheme === 'dark' ? (
                <Sun size={18} className="topbar__theme-icon topbar__theme-icon--sun" />
              ) : (
                <Moon size={18} className="topbar__theme-icon topbar__theme-icon--moon" />
              )}
            </button>

            {/* Notifications Bell & Dropdown Popover */}
            <div className="topbar__notif-wrap" ref={notifRef}>
              <button
                type="button"
                className={`topbar__icon-btn topbar__notif-btn ${notifDropdownOpen ? 'topbar__icon-btn--active' : ''}`}
                onClick={toggleNotificationDropdown}
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notifDropdownOpen}
              >
                <Bell size={18} className="topbar__bell-icon" />
                {unreadCount > 0 && (
                  <span className="topbar__icon-badge">{unreadCount}</span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifDropdownOpen && (
                <div className="topbar__notif-dropdown">
                  {/* Dropdown Header */}
                  <div className="topbar__notif-header">
                    <div className="topbar__notif-title-wrap">
                      <span className="topbar__notif-heading">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="topbar__notif-count-pill">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="topbar__notif-mark-all"
                        onClick={handleMarkAllRead}
                      >
                        <CheckCheck size={14} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {/* Dropdown Scrollable List */}
                  <div className="topbar__notif-list">
                    {loadingNotifs ? (
                      <div className="topbar__notif-empty">
                        <div className="topbar__notif-spinner" />
                        <span>Loading notifications...</span>
                      </div>
                    ) : notificationsList.length === 0 ? (
                      <div className="topbar__notif-empty">
                        <div className="topbar__notif-empty-icon">
                          <Bell size={24} />
                        </div>
                        <p className="topbar__notif-empty-title">No notifications</p>
                        <p className="topbar__notif-empty-sub">You're all caught up with your updates.</p>
                      </div>
                    ) : (
                      notificationsList.map((item) => {
                        const isUnread = !item.isRead && !item.read;
                        const cat = item.category || item.type || 'system';
                        return (
                          <div
                            key={item.id}
                            className={`topbar__notif-item ${isUnread ? 'topbar__notif-item--unread' : ''}`}
                            onClick={() => handleNotificationClick(item)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className={`topbar__notif-icon-badge topbar__notif-icon-badge--${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                              {getNotificationIcon(cat)}
                            </div>
                            <div className="topbar__notif-content">
                              <div className="topbar__notif-item-top">
                                <span className="topbar__notif-item-title">{item.title}</span>
                                {isUnread && <span className="topbar__notif-dot" />}
                              </div>
                              <p className="topbar__notif-item-msg">{item.message}</p>
                              <span className="topbar__notif-item-time">
                                {formatRelativeTime(item.createdAt || item.timestamp)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="topbar__notif-footer">
                    <button
                      type="button"
                      className="topbar__notif-view-all"
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        navigate(`${currentRoleNav.basePath}?tab=notifications`);
                      }}
                    >
                      <span>View all notifications</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard-layout__content">
          <Outlet context={{ unreadCount, setUnreadCount }} />
        </main>
      </div>
    </div>
  );
}

