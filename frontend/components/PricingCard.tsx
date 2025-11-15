import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Check } from "lucide-react";
import { Plan } from "@/types/plan";
import { PlanType } from "@/types/payment";
import { getIconComponent } from "@/frontend/utils/iconMapper";

interface PricingCardProps {
  plan: Plan;
  currentPlan: string | null;
  loading: string | null;
  handleSubscribe: (planType: string) => Promise<void>;
}

const PRIMARY_COLOR = "#B500FF";
export const PricingCard = ({
  plan,
  currentPlan,
  loading,
  handleSubscribe,
}: PricingCardProps) => {
  const isCurrentPlan = currentPlan === plan.type;
  const isLoading = loading === plan.type;
  const isFree = plan.type === PlanType.FREE;

  const getButtonText = () => {
    if (isLoading) return "Processing...";
    if (isCurrentPlan) return "Current Plan";
    if (isFree) return "Get Started";
    return "Buy Now";
  };

  const isButtonDisabled = isLoading || (isCurrentPlan && !isFree);

  return (
    <Card
      className={`relative bg-white rounded-2xl shadow-lg border border-gray-100 ${
        isCurrentPlan ? "ring-2 ring-green-500" : ""
      }`}
    >
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <Badge
            variant="outline"
            className="bg-green-500 text-white border-green-600"
          >
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-white"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {getIconComponent(plan.icon)}
        </div>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {plan.name}
          </CardTitle>
          <span className={`text-sm text-${PRIMARY_COLOR}`}>{plan.badge}</span>
        </div>
        <CardDescription className="text-gray-600 text-sm">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">
              ₹{plan.price}
            </span>
            <span className="text-gray-500 ml-2">
              / {plan.totalRequests} Messages
            </span>
          </div>
        </div>

        <Button
          className="w-full mb-6"
          style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}
          variant="default"
          onClick={() => handleSubscribe(plan.type)}
          disabled={isButtonDisabled}
        >
          {getButtonText()}
        </Button>

        <div>
          <p className="font-semibold text-gray-900 mb-4">
            {plan.name} plan includes:
          </p>
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
                >
                  <Check className="w-3 h-3" style={{ color: PRIMARY_COLOR }} />
                </div>
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
