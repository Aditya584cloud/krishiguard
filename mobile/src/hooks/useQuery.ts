import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string; httpStatus?: number };

export interface UseQueryResult<T> {
  state: QueryState<T>;
  refetch: () => void;
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function toHttpStatus(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[]): UseQueryResult<T> {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fn()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: toMessage(error), httpStatus: toHttpStatus(error) });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { state, refetch };
}

export interface MutationState<T> {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  message?: string;
}

export function useMutation<Input, Output>(
  fn: (input: Input) => Promise<Output>,
): [MutationState<Output>, (input: Input) => Promise<Output | undefined>] {
  const [state, setState] = useState<MutationState<Output>>({ status: "idle" });

  const run = useCallback(
    async (input: Input) => {
      setState({ status: "loading" });
      try {
        const data = await fn(input);
        setState({ status: "success", data });
        return data;
      } catch (error) {
        setState({ status: "error", message: toMessage(error) });
        return undefined;
      }
    },
    [fn],
  );

  return [state, run];
}
