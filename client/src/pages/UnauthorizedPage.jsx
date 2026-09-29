/**
 * 403 Unauthorized Page
 */

import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="status-page">
      <ShieldOff size={64} className="status-page__icon" />
      <h1 className="status-page__code">403</h1>
      <h2 className="status-page__title">Access Restricted</h2>
      <p className="status-page__message">
        You are not authorized to access this page. Please contact your hospital administrator if you believe this is an error.
      </p>
      <Link to="/dashboard" className="btn btn--primary">
        Go to Your Assigned Portal
      </Link>
    </div>
  );
}
