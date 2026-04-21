import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createFirewallIp, deleteFirewallIp, listFirewallIps } from "@/features/firewall/api";

export function useFirewall() {
  const queryClient = useQueryClient();

  const firewallQuery = useQuery({
    queryKey: ["firewall", "ips"],
    queryFn: listFirewallIps,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["firewall", "ips"] });
  };

  const createMutation = useMutation({
    mutationFn: (ipAddress: string) => createFirewallIp({ ipAddress }),
    onSuccess: () => {
      toast.success("방화벽에 IP를 추가했습니다");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "방화벽 IP를 추가하지 못했습니다");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ipAddress: string) => deleteFirewallIp(ipAddress),
    onSuccess: () => {
      toast.success("방화벽에서 IP를 제거했습니다");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "방화벽 IP를 제거하지 못했습니다");
    },
  });

  return {
    firewallQuery,
    createMutation,
    deleteMutation,
  };
}
