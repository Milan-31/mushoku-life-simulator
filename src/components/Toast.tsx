import { useEffect, useState } from "react";

interface Props {
  message: string | null;
  token: number;
}

export default function Toast({ message, token }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(t);
  }, [message, token]);

  if (!visible || !message) return null;
  return <div className="toast" role="status">{message}</div>;
}