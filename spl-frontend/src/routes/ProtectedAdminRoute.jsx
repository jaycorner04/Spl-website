import { Navigate, useLocation } from "react-router-dom";
import {
  clearAuthSession,
  getDefaultPostLoginPath,
  getAuthUser,
  isAuthorizedForPath,
} from "../utils/authStorage";

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();

  const user = getAuthUser();

  if (user && isAuthorizedForPath(location.pathname, user)) {
    return children;
  }

  if (user) {
    return (
      <Navigate
        to={getDefaultPostLoginPath(user.role)}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  clearAuthSession();

  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
