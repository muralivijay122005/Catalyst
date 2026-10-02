// src/components/task/taskApi.js
import { api } from "../../lib/api";
import { toast } from "../ui/toast";
import { STATUS } from "../../lib/constants";

/** PATCH a task and explain anything the server decided on the user's behalf (e.g. routed to review). */
export async function patchTask(task, patch, { quiet = false } = {}) {
  try {
    const updated = await api.patch(`/tasks/${task._id}`, patch);
    if (updated.routedToReview) {
      toast.info(`${updated.ref} sent for review`, { description: "A project manager needs to approve it before it counts as done." });
    } else if (!quiet && patch.status && patch.status !== task.status) {
      toast.success(`${updated.ref} moved to ${STATUS[updated.status].label}`);
    }
    return updated;
  } catch (err) {
    toast.error(err.message);
    throw err;
  }
}
