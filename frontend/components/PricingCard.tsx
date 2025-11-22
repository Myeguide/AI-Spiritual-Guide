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
import { Check, Loader2, Sparkles } from "lucide-react";
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
  const isPopular = plan.badge?.toLowerCase().includes("popular");
  const isPremium = plan.badge?.toLowerCase().includes("premium");

  const getButtonText = () => {
    if (isLoading) return "Processing...";
    if (isCurrentPlan) return "Current Plan";
    if (isFree) return "Get Started";
    return "Buy Now";
  };

  const isButtonDisabled = isLoading || (isCurrentPlan && !isFree);

  return (
    <Card
      className={`relative bg-white rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl ${
        isCurrentPlan ? "ring-2 ring-green-500 border-green-500" : ""
      }`}
    >
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <Badge
            variant="outline"
            className="bg-green-500 text-white border-green-600 font-medium shadow-lg"
          >
            ✓ Current Plan
          </Badge>
        </div>
      )}

      <CardHeader>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-md transition-transform hover:scale-110"
          style={{
            background:
              isPopular || isPremium
                ? `linear-gradient(135deg, ${PRIMARY_COLOR}, #7c3aed)`
                : PRIMARY_COLOR,
          }}
        >
          {getIconComponent(plan.icon)}
        </div>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-2xl font-bold">
            {plan.name}
          </CardTitle>
          {!isPopular && !isPremium && plan.badge && (
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                color: PRIMARY_COLOR,
                backgroundColor: `${PRIMARY_COLOR}15`,
              }}
            >
              {plan.badge}
            </span>
          )}
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">₹{plan.price}</span>
            <span className="text-gray-500 text-sm ml-1">
              / {plan.totalRequests.toLocaleString()} Messages
            </span>
          </div>
          {/* {plan.validityDays && (
            <p className="text-xs text-gray-500 mt-1">
              Valid for {plan.validityDays} days
            </p>
          )} */}
        </div>

        <Button
          className={`w-full mb-6 font-medium transition-all duration-200 ${
            isButtonDisabled
              ? "opacity-60 cursor-not-allowed"
              : "hover:shadow-lg hover:-translate-y-0.5"
          }`}
          style={{
            background:
              isPopular || isPremium
                ? `linear-gradient(135deg, ${PRIMARY_COLOR}, #7c3aed)`
                : isCurrentPlan
                ? "#10b981"
                : PRIMARY_COLOR,
            color: "white",
            border: "none",
          }}
          variant="default"
          onClick={() => handleSubscribe(plan.type)}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            getButtonText()
          )}
        </Button>

        <div>
          <p className="font-semibold mb-4 text-sm">{plan.name} includes:</p>
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform hover:scale-110"
                  style={{
                    background:
                      isPopular || isPremium
                        ? `linear-gradient(135deg, ${PRIMARY_COLOR}30, #7c3aed30)`
                        : `${PRIMARY_COLOR}20`,
                  }}
                >
                  <Check
                    className="w-3 h-3"
                    style={{
                      color:
                        isPopular || isPremium ? PRIMARY_COLOR : PRIMARY_COLOR,
                    }}
                  />
                </div>
                <span className="text-sm leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
