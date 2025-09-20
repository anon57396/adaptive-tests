import React from 'react';

/**
 * User Card component with props
 */
export const UserCard = ({
  user,
  onEdit,
  onDelete,
  showActions = true,
  compact = false
}) => {
  if (!user) return null;

  const { id, name, email, avatar, role, status } = user;

  if (compact) {
    return (
      <div className="user-card-compact" data-testid="user-card-compact">
        {avatar && <img src={avatar} alt={name} className="avatar-small" />}
        <span className="name">{name}</span>
        <span className="status" data-status={status}>{status}</span>
      </div>
    );
  }

  return (
    <div className="user-card" data-testid="user-card">
      <div className="user-header">
        {avatar && (
          <img
            src={avatar}
            alt={name}
            className="avatar"
            data-testid="user-avatar"
          />
        )}
        <div className="user-info">
          <h3 data-testid="user-name">{name}</h3>
          <p data-testid="user-email">{email}</p>
          {role && <span className="role" data-testid="user-role">{role}</span>}
        </div>
      </div>

      <div className="user-status" data-status={status}>
        Status: {status || 'Active'}
      </div>

      {showActions && (
        <div className="user-actions">
          <button
            onClick={() => onEdit(id)}
            data-testid="edit-button"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(id)}
            data-testid="delete-button"
            className="danger"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Higher Order Component for authentication
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const isAuthenticated = props.user && props.user.isAuthenticated;

    if (!isAuthenticated) {
      return <div>Please log in to view this content</div>;
    }

    return <Component {...props} />;
  };
}

// Custom Hook
export function useUserStatus(initialStatus = 'active') {
  const [status, setStatus] = React.useState(initialStatus);

  const updateStatus = (newStatus) => {
    const validStatuses = ['active', 'inactive', 'pending', 'banned'];
    if (validStatuses.includes(newStatus)) {
      setStatus(newStatus);
    }
  };

  return [status, updateStatus];
}

export default UserCard;