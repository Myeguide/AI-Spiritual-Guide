import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Check } from "lucide-react";
import { Plan } from "@/types/plan";

interface PricingCardProps {
  plan: Plan;
  currentPlan: string | null;
  loading: string | null;
  handleSubscribe: (planType: string) => Promise<void>;
}

export const PricingCard = ({
  plan,
  currentPlan,
  loading,
  handleSubscribe,
}: PricingCardProps) => {
  const isCurrentPlan = currentPlan === plan.type;
  const isLoading = loading === plan.type;
  const isFree = plan.type === "free";
  const isFamily = plan.type === "family";

  // Determine button text based on state
  const getButtonText = () => {
    if (isLoading) return "Processing...";
    if (isCurrentPlan) return "Current Plan";
    if (isFree) return "Get Started";
    if (isFamily) return "Coming Soon";
    return "Buy Now";
  };

  // Button should be disabled when loading, current plan (except free), or family plan
  const isButtonDisabled = isLoading || (isCurrentPlan && !isFree) || isFamily;

  return (
    <Card
      className={`relative flex flex-col ${
        plan.popular && !isCurrentPlan
          ? "border-purple-500 border-2 shadow-lg scale-105"
          : ""
      } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
    >
      {/* Popular Badge */}
      {plan.badge && !isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-linear-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
            {plan.badge}
          </Badge>
        </div>
      )}

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

      <CardHeader className="text-center">
        <div className="mx-auto w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300">
          {plan.icon}
        </div>
        <CardTitle className="text-2xl"></CardTitle>
        <CardDescription className="mt-2 text-gray-400">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="grow">
        {/* Price */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center">
            <span className="text-2xl font-bold">{plan.displayPrice}/</span>
            <span className="text-gray-500 dark:text-gray-400">
              {plan.billingCycle}
            </span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-500 dark:text-gray-300">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className={`${isFree ? "hidden" : "w-full bg-[#B500FF]! text-white"}`}
          variant={"outline"}
          size="lg"
          onClick={() => handleSubscribe(plan.type)}
          disabled={isButtonDisabled}
        >
          {getButtonText()}
        </Button>
      </CardFooter>
    </Card>
  );
};
