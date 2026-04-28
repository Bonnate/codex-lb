import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Collapsible } from "radix-ui";

import { AlertMessage } from "@/components/alert-message";
import { useAccountMutations } from "@/features/accounts/hooks/use-accounts";
import { AccountExpiryCalendar } from "@/features/dashboard/components/account-expiry-calendar";
import { AccountCards } from "@/features/dashboard/components/account-cards";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { OverviewTimeframeSelect } from "@/features/dashboard/components/filters/overview-timeframe-select";
import { RequestFilters } from "@/features/dashboard/components/filters/request-filters";
import { RecentRequestsTable } from "@/features/dashboard/components/recent-requests-table";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { UsageDonuts } from "@/features/dashboard/components/usage-donuts";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { useRequestLogs } from "@/features/dashboard/hooks/use-request-logs";
import { buildDashboardView } from "@/features/dashboard/utils";
import {
  DEFAULT_OVERVIEW_TIMEFRAME,
  parseOverviewTimeframe,
  type AccountSummary,
  type OverviewTimeframe,
} from "@/features/dashboard/schemas";
import { useThemeStore } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { REQUEST_STATUS_LABELS } from "@/utils/constants";
import { formatModelLabel, formatSlug } from "@/utils/formatters";

const MODEL_OPTION_DELIMITER = ":::";

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const overviewTimeframe = useMemo(
    () => parseOverviewTimeframe(searchParams.get("overviewTimeframe")),
    [searchParams],
  );
  const dashboardQuery = useDashboard(overviewTimeframe);
  const { filters, logsQuery, optionsQuery, updateFilters } = useRequestLogs();
  const { resumeMutation } = useAccountMutations();

  const isRefreshing = dashboardQuery.isFetching || logsQuery.isFetching;

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  const handleOverviewTimeframeChange = useCallback(
    (timeframe: OverviewTimeframe) => {
      const next = new URLSearchParams(searchParams);
      if (timeframe === DEFAULT_OVERVIEW_TIMEFRAME) {
        next.delete("overviewTimeframe");
      } else {
        next.set("overviewTimeframe", timeframe);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const handleAccountAction = useCallback(
    (account: AccountSummary, action: string) => {
      switch (action) {
        case "details":
          navigate(`/accounts?selected=${account.accountId}`);
          break;
        case "resume":
          void resumeMutation.mutateAsync(account.accountId);
          break;
        case "reauth":
          navigate(`/accounts?selected=${account.accountId}`);
          break;
      }
    },
    [navigate, resumeMutation],
  );

  const overview = dashboardQuery.data;
  const logPage = logsQuery.data;

  const view = useMemo(() => {
    if (!overview || !logPage) {
      return null;
    }
    return buildDashboardView(overview, logPage.requests, isDark);
  }, [overview, logPage, isDark]);

  const accountOptions = useMemo(() => {
    const entries = new Map<string, { label: string; isEmail: boolean }>();
    for (const account of overview?.accounts ?? []) {
      const raw = account.displayName || account.email || account.accountId;
      const isEmail = !!account.email && raw === account.email;
      entries.set(account.accountId, { label: raw, isEmail });
    }
    return (optionsQuery.data?.accountIds ?? []).map((accountId) => {
      const entry = entries.get(accountId);
      return {
        value: accountId,
        label: entry?.label ?? accountId,
        isEmail: entry?.isEmail ?? false,
      };
    });
  }, [optionsQuery.data?.accountIds, overview?.accounts]);

  const modelOptions = useMemo(
    () =>
      (optionsQuery.data?.modelOptions ?? []).map((option) => ({
        value: `${option.model}${MODEL_OPTION_DELIMITER}${option.reasoningEffort ?? ""}`,
        label: formatModelLabel(option.model, option.reasoningEffort),
      })),
    [optionsQuery.data?.modelOptions],
  );

  const statusOptions = useMemo(
    () =>
      (optionsQuery.data?.statuses ?? []).map((status) => ({
        value: status,
        label: REQUEST_STATUS_LABELS[status] ?? formatSlug(status),
      })),
    [optionsQuery.data?.statuses],
  );

  const errorMessage =
    (dashboardQuery.error instanceof Error && dashboardQuery.error.message) ||
    (logsQuery.error instanceof Error && logsQuery.error.message) ||
    (optionsQuery.error instanceof Error && optionsQuery.error.message) ||
    null;

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 현황, 계정 상태, 최근 요청 로그를 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OverviewTimeframeSelect
            value={overviewTimeframe}
            onChange={handleOverviewTimeframeChange}
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            title="대시보드 새로고침"
          >
            <RefreshCw className={`h-4 w-4${isRefreshing ? " animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      {!view ? (
        <DashboardSkeleton />
      ) : (
        <>
          <StatsGrid stats={view.stats} />

            <UsageDonuts
              primaryItems={view.primaryUsageItems}
              secondaryItems={view.secondaryUsageItems}
              primaryTotal={overview?.summary.primaryWindow.capacityCredits ?? 0}
              secondaryTotal={overview?.summary.secondaryWindow?.capacityCredits ?? 0}
              primaryCenterValue={view.primaryTotal}
              secondaryCenterValue={view.secondaryTotal}
              safeLinePrimary={view.safeLinePrimary}
              safeLineSecondary={view.safeLineSecondary}
            />

          <AccountExpiryCalendar accounts={overview?.accounts ?? []} />

          <Collapsible.Root defaultOpen={false} className="group space-y-4">
            <Collapsible.Trigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md text-left outline-none ring-offset-background transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    "group-data-[state=open]:rotate-180",
                  )}
                />
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                  계정
                </h2>
                <div className="h-px flex-1 bg-border" />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
              <AccountCards accounts={overview?.accounts ?? []} onAction={handleAccountAction} />
            </Collapsible.Content>
          </Collapsible.Root>

          <Collapsible.Root defaultOpen={false} className="group space-y-4">
            <Collapsible.Trigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md text-left outline-none ring-offset-background transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    "group-data-[state=open]:rotate-180",
                  )}
                />
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                  요청 로그
                </h2>
                <div className="h-px flex-1 bg-border" />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content className="space-y-4 overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
              <RequestFilters
                filters={filters}
                accountOptions={accountOptions}
                modelOptions={modelOptions}
                statusOptions={statusOptions}
                onSearchChange={(search) => updateFilters({ search, offset: 0 })}
                onTimeframeChange={(timeframe) => updateFilters({ timeframe, offset: 0 })}
                onAccountChange={(accountIds) => updateFilters({ accountIds, offset: 0 })}
                onModelChange={(modelOptionsSelected) =>
                  updateFilters({ modelOptions: modelOptionsSelected, offset: 0 })
                }
                onStatusChange={(statuses) => updateFilters({ statuses, offset: 0 })}
                onReset={() =>
                  updateFilters({
                    search: "",
                    timeframe: "all",
                    accountIds: [],
                    modelOptions: [],
                    statuses: [],
                    offset: 0,
                  })
                }
              />
              <div className="transition-opacity duration-200">
                <RecentRequestsTable
                  requests={view.requestLogs}
                  accounts={overview?.accounts ?? []}
                  total={logPage?.total ?? 0}
                  limit={filters.limit}
                  offset={filters.offset}
                  hasMore={logPage?.hasMore ?? false}
                  onLimitChange={(limit) => updateFilters({ limit, offset: 0 })}
                  onOffsetChange={(offset) => updateFilters({ offset })}
                />
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        </>
      )}

    </div>
  );
}
