/**
 * 404 Not Found Page
 */

import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="status-page">
      <FileQuestion size={64} className="status-page__icon" />
      <h1 className="status-page__code">404</h1>
      <h2 className="status-page__title">Page Not Found</h2>
      <p className="status-page__message">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="btn btn--primary">
        Go to Dashboard
      </Link>
    </div>
  );
}
