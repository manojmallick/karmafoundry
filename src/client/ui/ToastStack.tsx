import React from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "info" | "boost";
}

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  React.useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => onDismiss(toast.id), 3000)
    );

    return () => timers.forEach(clearTimeout);
  }, [toasts, onDismiss]);

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            ...(toast.type === "boost" ? styles.boostToast : {}),
          }}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.type === "boost" && <span style={styles.icon}>⚡</span>}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: "80px",
    right: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 1500,
    pointerEvents: "none",
  } as React.CSSProperties,
  toast: {
    padding: "12px 20px",
    background: "rgba(7, 10, 20, 0.92)",
    backdropFilter: "blur(14px)",
    borderRadius: "var(--kf-r-1)",
    border: "1px solid var(--kf-border)",
    color: "var(--kf-text)",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "var(--kf-shadow-1)",
    animation: "slideInRight 0.3s",
    pointerEvents: "auto",
    cursor: "pointer",
    maxWidth: "300px",
  } as React.CSSProperties,
  boostToast: {
    background: "var(--kf-grad-purple)",
    fontWeight: 800,
    border: "none",
    boxShadow: "0 8px 24px rgba(124, 92, 255, 0.25)",
  } as React.CSSProperties,
  icon: {
    marginRight: "8px",
    fontSize: "18px",
  } as React.CSSProperties,
};
