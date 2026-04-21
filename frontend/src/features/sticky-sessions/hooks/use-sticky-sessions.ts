import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  deleteFilteredStickySessions,
  deleteStickySessions,
  listStickySessions,
  purgeStickySessions,
} from "@/features/sticky-sessions/api";
import type {
  StickySessionIdentifier,
  StickySessionSortBy,
  StickySessionSortDir,
  StickySessionsDeleteFilteredResponse,
  StickySessionsDeleteResponse,
  StickySessionsListParams,
} from "@/features/sticky-sessions/schemas";

const DEFAULT_STICKY_SESSIONS_LIMIT = 10;

export function useStickySessions() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<StickySessionsListParams>({
    staleOnly: false,
    accountQuery: "",
    keyQuery: "",
    sortBy: "updated_at",
    sortDir: "desc",
    offset: 0,
    limit: DEFAULT_STICKY_SESSIONS_LIMIT,
  });
  const deferredAccountQuery = useDeferredValue(params.accountQuery);
  const deferredKeyQuery = useDeferredValue(params.keyQuery);
  const queryParams = useMemo(
    () => ({
      ...params,
      accountQuery: deferredAccountQuery,
      keyQuery: deferredKeyQuery,
    }),
    [deferredAccountQuery, deferredKeyQuery, params],
  );

  const stickySessionsQuery = useQuery({
    queryKey: ["sticky-sessions", "list", queryParams],
    queryFn: () => listStickySessions(queryParams),
    placeholderData: (previousData) => previousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["sticky-sessions", "list"] });
  };

  const setOffset = (offset: number) => {
    setParams((current) => ({ ...current, offset }));
  };

  const setLimit = (limit: number) => {
    setParams((current) => ({ ...current, limit, offset: 0 }));
  };

  const setAccountQuery = (accountQuery: string) => {
    setParams((current) => ({ ...current, accountQuery, offset: 0 }));
  };

  const setKeyQuery = (keyQuery: string) => {
    setParams((current) => ({ ...current, keyQuery, offset: 0 }));
  };

  const setSort = (sortBy: StickySessionSortBy, sortDir: StickySessionSortDir) => {
    setParams((current) => ({ ...current, sortBy, sortDir, offset: 0 }));
  };

  const deleteMutation = useMutation({
    mutationFn: (targets: StickySessionIdentifier[]) => deleteStickySessions({ sessions: targets }),
    onSuccess: async (response: StickySessionsDeleteResponse) => {
      if (response.deletedCount > 0 && response.failed.length === 0) {
        toast.success(response.deletedCount === 1 ? "스티키 세션을 삭제했습니다" : `${response.deletedCount}개의 세션을 삭제했습니다`);
      } else if (response.deletedCount > 0) {
        toast.warning(
          `${response.deletedCount}개의 세션을 삭제했습니다. ${response.failed.length}개는 삭제하지 못했습니다.`,
        );
      } else {
        toast.error("선택한 세션을 삭제하지 못했습니다");
      }
      await invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "스티키 세션을 삭제하지 못했습니다");
    },
  });

  const deleteFilteredMutation = useMutation({
    mutationFn: () =>
      deleteFilteredStickySessions({
        staleOnly: queryParams.staleOnly,
        accountQuery: queryParams.accountQuery,
        keyQuery: queryParams.keyQuery,
      }),
    onSuccess: async (response: StickySessionsDeleteFilteredResponse) => {
      if (response.deletedCount > 0) {
        toast.success(
          response.deletedCount === 1 ? "필터링된 스티키 세션을 삭제했습니다" : `필터링된 세션 ${response.deletedCount}개를 삭제했습니다`,
        );
      } else {
        toast.error("필터링된 세션을 삭제하지 못했습니다");
      }
      await invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "필터링된 스티키 세션을 삭제하지 못했습니다");
    },
  });

  const purgeMutation = useMutation({
    mutationFn: (staleOnly: boolean) => purgeStickySessions({ staleOnly }),
    onSuccess: (response) => {
      toast.success(`스티키 세션 ${response.deletedCount}개를 정리했습니다`);
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "스티키 세션을 정리하지 못했습니다");
    },
  });

  return {
    params,
    setAccountQuery,
    setKeyQuery,
    setSort,
    setOffset,
    setLimit,
    stickySessionsQuery,
    deleteMutation,
    deleteFilteredMutation,
    purgeMutation,
  };
}
