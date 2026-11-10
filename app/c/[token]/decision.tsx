"use client";
import { useActionState } from "react";
import { decideAction, type DecisionState } from "../actions";

export function DecisionButtons({ token, flatmateId, name, declined }: { token: string; flatmateId: number; name: string; declined: boolean }) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(decideAction, {});
  const first = name.split(" ")[0];
  return (
    <div>
      <form action={action} className="flex flex-wrap gap-2 justify-end">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="flatmate_id" value={flatmateId} />
        {!declined && <button name="decision" value="decline" className="btn-outline" disabled={pending}>Not for me</button>}
        <button name="decision" value="accept" className="btn-primary" disabled={pending}>{pending ? "Saving…" : declined ? `Changed my mind — accept ${first}` : `Accept ${first}`}</button>
      </form>
      {state.error && <p className="text-[12.5px] text-brand-700 mt-2 text-right">{state.error}</p>}
    </div>
  );
}
