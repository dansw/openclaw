import type { BoardGetParams } from "@openclaw/gateway-protocol";
import type { ControlUiAction, ControlUiSession } from "../../../src/plugin-sdk/control-ui.js";
import type { ControlUiRegistration } from "./control-ui-capability.ts";
import { scopeControlUiHost } from "./control-ui-scope.ts";

export type ControlUiPluginActionParams = BoardGetParams & {
  placement: ControlUiAction["placement"];
  session?: ControlUiSession;
  signal: AbortSignal;
};

export async function runControlUiPluginAction(
  params: ControlUiPluginActionParams,
  entry: ControlUiRegistration<ControlUiAction> | undefined,
): Promise<void> {
  const retry =
    params.placement === "session"
      ? "Reopen the session menu."
      : "Try again from the current view.";
  if (params.placement === "session" && !params.session) {
    throw new Error(`This session is no longer available. ${retry}`);
  }
  if (!entry) {
    throw new Error(`This plugin action is no longer active. ${retry}`);
  }
  const signal = AbortSignal.any([params.signal, entry.signal]);
  signal.throwIfAborted();
  const context = {
    sessionKey: params.sessionKey,
    agentId: params.agentId ?? params.session?.agentId,
    session: params.session ? structuredClone(params.session) : undefined,
  };
  const state = entry.value.resolve?.(context);
  // A resolver can synchronously withdraw its own registration.
  signal.throwIfAborted();
  if (state?.hidden || state?.disabled) {
    throw new Error(`This plugin action is currently unavailable. ${retry}`);
  }
  await entry.value.run({
    ...context,
    host: scopeControlUiHost(entry.host, signal),
    signal,
  });
  signal.throwIfAborted();
}
