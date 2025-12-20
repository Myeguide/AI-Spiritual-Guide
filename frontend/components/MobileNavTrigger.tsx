import { Button } from './ui/button';
import { Menu } from 'lucide-react';

interface MobileNavTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export default function MobileNavTrigger({ onClick, isOpen }: MobileNavTriggerProps) {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="icon"
      className="fixed right-4 top-4 z-50 md:hidden bg-background border"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}