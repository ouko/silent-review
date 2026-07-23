import { useFeatureFlag } from "../../hooks/useFeatureFlag";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { enabled, isLoading } = useFeatureFlag(feature);

  if (isLoading) {
    return null;
  }

  if (!enabled) {
    return fallback;
  }

  return <>{children}</>;
}
