"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ConnectState {
  connected: boolean;
  account?: {
    id: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
  error?: string;
}

export function StripeConnectButton() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [state, setState] = useState<ConnectState>({ connected: false });

  async function fetchStatus() {
    setStatusLoading(true);
    try {
      const response = await fetch("/api/stripe/connect", { cache: "no-store" });
      const data = (await response.json()) as ConnectState;
      setState(data);
    } catch {
      setState({ connected: false, error: "Failed to load Stripe connection status." });
    } finally {
      setStatusLoading(false);
    }
  }

  async function connectAccount() {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = (await response.json()) as { onboardingUrl?: string; error?: string };

      if (!response.ok || !data.onboardingUrl) {
        throw new Error(data.error ?? "Could not generate Stripe onboarding link.");
      }

      window.location.assign(data.onboardingUrl);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unable to start Stripe onboarding."
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PlugZap className="h-5 w-5 text-blue-400" />
          Stripe Connect
        </CardTitle>
        <CardDescription>
          Link your Stripe account once, then this app pulls your payouts automatically for reconciliation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusLoading ? (
            <Badge variant="outline">Checking connection...</Badge>
          ) : state.connected ? (
            <Badge variant="success" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </Badge>
          ) : (
            <Badge variant="warning">Not Connected</Badge>
          )}

          {state.account?.id ? (
            <span className="text-xs text-[#8b949e]">Account: {state.account.id}</span>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Stripe account email"
          />
          <Button onClick={connectAccount} disabled={loading || statusLoading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {state.connected ? "Reconnect Stripe" : "Connect Stripe"}
          </Button>
        </div>

        {state.error ? <p className="text-sm text-rose-400">{state.error}</p> : null}
      </CardContent>
    </Card>
  );
}
