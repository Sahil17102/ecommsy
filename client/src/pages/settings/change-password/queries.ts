import { useMutation } from "@tanstack/react-query";
import { passwordApi, type ChangePasswordPayload } from "./api";

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => passwordApi.change(payload),
  });
}
