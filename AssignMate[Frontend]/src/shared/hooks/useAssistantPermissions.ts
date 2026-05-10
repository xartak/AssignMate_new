import { useEffect, useState } from "react";
import { fetchMyPermissions, type AssistantPermissions } from "@/features/courses/api";
import { useAuth } from "@/shared/hooks/useAuth";

const DEFAULT_PERMS: AssistantPermissions = {
  user_id: 0,
  email: "",
  first_name: null,
  last_name: null,
  can_edit_homework: false,
  can_review_homework: false,
  can_add_homework: false,
  can_add_materials: false,
};

export function useAssistantPermissions(courseId: string | undefined) {
  const { role } = useAuth();
  const [perms, setPerms] = useState<AssistantPermissions>(DEFAULT_PERMS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role !== "assistant" || !courseId) {
      setPerms(DEFAULT_PERMS);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMyPermissions(courseId)
      .then((data) => {
        if (!cancelled) setPerms(data);
      })
      .catch(() => {
        if (!cancelled) setPerms(DEFAULT_PERMS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, role]);

  return { perms, loading };
}
