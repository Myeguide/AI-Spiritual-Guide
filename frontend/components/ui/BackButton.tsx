import { useNavigate } from "react-router";
import { Button } from "./button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = "" }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // If no history, navigate to home
      navigate("/");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      className={`absolute top-2 left-2 z-10 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
