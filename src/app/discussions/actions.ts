"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { discussionTopics, isUuid, requireDiscussionAccess } from "../../lib/discussion-access";

export async function askQuestion(formData: FormData) {
  const { supabase, user } = await requireDiscussionAccess();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const resource_key = String(formData.get("resource_key") ?? "general");
  if (title.length < 5 || title.length > 160 || body.length < 10 || body.length > 6000 ||
    !discussionTopics.some((topic) => topic.key === resource_key)) {
    redirect("/discussions/new?error=invalid");
  }
  const { data, error } = await supabase.from("discussion_threads")
    .insert({ title, body, resource_key, author_id: user.id }).select("id").single();
  if (error || !data) redirect("/discussions/new?error=save");
  revalidatePath("/discussions");
  redirect(`/discussions/${data.id}`);
}

export async function postReply(threadId: string, formData: FormData) {
  if (!isUuid(threadId)) redirect("/discussions");
  const { supabase, user } = await requireDiscussionAccess();
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 2 || body.length > 4000) redirect(`/discussions/${threadId}?error=invalid`);
  const { data: allowed, error: accessError } = await supabase.rpc("can_reply_discussion", { p_thread_id: threadId });
  if (accessError || !allowed) redirect(`/discussions/${threadId}?error=permission`);
  const { error } = await supabase.from("discussion_replies")
    .insert({ thread_id: threadId, body, author_id: user.id });
  if (error) redirect(`/discussions/${threadId}?error=save`);
  revalidatePath(`/discussions/${threadId}`);
  redirect(`/discussions/${threadId}#replies`);
}

export async function setDiscussionState(threadId: string, formData: FormData) {
  if (!isUuid(threadId)) redirect("/discussions");
  const { supabase } = await requireDiscussionAccess();
  const status = String(formData.get("status") ?? "");
  const solution = String(formData.get("solution_reply_id") ?? "");
  if (!["open", "answered", "closed"].includes(status) || (solution && !isUuid(solution))) {
    redirect(`/discussions/${threadId}?error=invalid`);
  }
  const { error } = await supabase.rpc("set_discussion_state", {
    p_thread_id: threadId, p_status: status, p_solution_reply_id: solution || null,
  });
  if (error) redirect(`/discussions/${threadId}?error=permission`);
  revalidatePath(`/discussions/${threadId}`);
  revalidatePath("/discussions");
  redirect(`/discussions/${threadId}`);
}
