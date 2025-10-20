import React from "react";
import { Alert, AlertDescription } from "./ui/alert";
// import { Button } from "@/components/ui/button";
import { Badge } from "./ui/badge";
import { Crown, TrendingUp, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router";

interface AuthStatus {
  planType: string;
  allowed: boolean;
  tokensUsed: number;
  tokenLimit: number;
  remainingTokens: number;
  requestsThisMinute: number;
  requestLimit: number;
  reason?: string;
}

interface TokenProps {
  authStatus: AuthStatus;
  formatTokens: (tokens: number) => string;
}

interface RateProps {
  authStatus: AuthStatus;
  countdown: number;
}

interface NavigateProps {
  navigate: ReturnType<typeof useNavigate>;
  reason?: string;
}

// ✅ Free Plan Warning
export const FreePlanWarning: React.FC<NavigateProps> = ({ navigate }) => (
  <div className="px-4 pb-2">
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <AlertDescription className="flex items-center justify-between text-sm">
        <span className="text-yellow-900 dark:text-yellow-100">
          ⚠️ Free Plan: Limited to 5 messages. Upgrade for 300K+ tokens/month!
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/billing")}
          className="border-yellow-600 text-yellow-600"
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  </div>
);

// ✅ High Token Usage Warning
export const HighTokenUsageWarning: React.FC<TokenProps> = ({
  authStatus,
  formatTokens,
}) => (
  <div className="px-4 pb-2">
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
      <TrendingUp className="h-4 w-4 text-orange-600" />
      <AlertDescription className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-orange-900 dark:text-orange-100">
            ⚠️ High Token Usage
          </span>
          <Badge
            variant="outline"
            className="border-orange-600 text-orange-600"
          >
            {formatTokens(authStatus.remainingTokens)} remaining
          </Badge>
        </div>
        <p className="text-xs text-orange-700 dark:text-orange-300">
          You have used{" "}
          {(
            (authStatus.tokensUsed / authStatus.tokenLimit) *
            100
          ).toFixed(0)}
          % of your monthly token limit.
        </p>
      </AlertDescription>
    </Alert>
  </div>
);

// ✅ Rate Limit Warning
export const RateLimitWarning: React.FC<RateProps> = ({
  authStatus,
  countdown,
}) => (
  <div className="px-4 pb-2">
    <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
      <Clock className="h-4 w-4 text-blue-600" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Rate Limit Reached
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {authStatus.requestsThisMinute}/{authStatus.requestLimit} requests
              this minute
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-blue-600 text-blue-600 font-mono"
          >
            <Clock className="w-3 h-3 mr-1" />
            {countdown}s
          </Badge>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          ⏳ Please wait. Your limit resets in {countdown} seconds.
        </p>
      </AlertDescription>
    </Alert>
  </div>
);

// ✅ Upgrade Banner
export const UpgradeBanner: React.FC<NavigateProps> = ({
  navigate,
  reason,
}) => (
  <div className="px-4 pb-2">
    <Alert variant="destructive">
      <AlertDescription className="flex items-center justify-between text-sm">
        <span>🚫 {reason || "You've reached your limit"}</span>
        <Button
          size="sm"
          onClick={() => navigate("/billing")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
      </AlertDescription>
    </Alert>
  </div>
);

// ✅ Token Limit Exceeded
export const TokenLimitExceeded: React.FC<NavigateProps> = ({
  navigate,
  reason,
}) => (
  <div className="px-4 pb-2">
    <Alert variant="destructive">
      <AlertDescription className="flex items-center justify-between text-sm">
        <span>🚫 {reason}</span>
        <Button
          size="sm"
          onClick={() => navigate("/billing")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  </div>
);
