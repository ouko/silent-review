import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";

interface DuetRecorderProps {
  reviewId: string;
}

export function DuetRecorder({ reviewId }: DuetRecorderProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="secondary"
      onClick={() => navigate(`/record?duet=${reviewId}`)}
      className="w-full"
    >
      Duet this review
    </Button>
  );
}
