import type { ControlUiSession } from "../../../src/plugin-sdk/control-ui.js";
import type { PluginSessionMenuAction } from "../components/session-menu.ts";
import type { ControlUiPluginActionParams } from "./control-ui-actions.runtime.ts";
import type { ControlUiPluginCapability } from "./control-ui-capability.ts";

export function pluginSessionMenuActions(
  runtime: ControlUiPluginCapability,
  session: ControlUiSession,
): PluginSessionMenuAction[] {
  return runtime
    .registrations("actions")
    .filter((entry) => entry.value.placement === "session")
    .flatMap((entry) => {
      try {
        const state = entry.value.resolve?.({
          sessionKey: session.key,
          agentId: session.agentId,
          session: structuredClone(session),
        });
        return state?.hidden
          ? []
          : [
              {
                id: entry.key,
                label: state?.label ?? entry.value.label,
                disabled: state?.disabled,
              },
            ];
      } catch (error) {
        runtime.reportError(entry.pluginId, error);
        return [];
      }
    });
}

export async function runControlUiPluginAction(
  params: Omit<ControlUiPluginActionParams, "session"> & {
    runtime: ControlUiPluginCapability;
    id: string;
    getSession: () => ControlUiSession | undefined;
  },
): Promise<void> {
  const entry = params.runtime
    .registrations("actions")
    .find(
      (candidate) => candidate.key === params.id && candidate.value.placement === params.placement,
    );
  // Keep the clicked registration's lifetime, but read current session state after loading.
  const { runControlUiPluginAction: run } = await import("./control-ui-actions.runtime.ts");
  return run({ ...params, session: params.getSession() }, entry);
}
