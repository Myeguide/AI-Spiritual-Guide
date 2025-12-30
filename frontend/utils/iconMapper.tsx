import React from "react";
import { Zap, Crown, Users, Repeat1 } from "lucide-react";

export const getIconComponent = (iconName: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    zap: <Zap className="w-6 h-6" />,
    repeat: <Repeat1 className="w-6 h-6" />,
    crown: <Crown className="w-6 h-6" />,
    users: <Users className="w-6 h-6" />,
  };

  return icons[iconName] || <Zap className="w-6 h-6" />;
};
