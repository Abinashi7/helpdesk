import { Link } from 'react-router-dom';

interface Props {
  to: string;
  label: string;
}

export default function BackLink({ to, label }: Props) {
  return (
    <Link to={to} className="text-sm text-muted-foreground link">
      ← {label}
    </Link>
  );
}
