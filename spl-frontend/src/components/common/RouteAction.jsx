import { useNavigate } from "react-router-dom";

export default function RouteAction({
  to,
  children,
  className = "",
  onClick,
  replace = false,
  state,
  type = "button",
  ...props
}) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    onClick?.(event);

    if (event.defaultPrevented || props.disabled) {
      return;
    }

    navigate(to, { replace, state });
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      className={`appearance-none border-0 bg-transparent p-0 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
