import { Suspense } from "react";
import { auth } from "@/auth";
import { CourseCodeExplorer } from "@/components/course-code-explorer";
import { getExploreData } from "@/lib/explore-data";
import { accountLabel } from "@/lib/user-display";
import { ExploreLoading } from "./explore-loading";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const session = await auth();
  const payload =
    session?.user != null
      ? await getExploreData(session.user.id, session.user.role)
      : { courses: [], codeLabels: {} as Record<string, string | null> };
  const accountLine =
    session?.user &&
    (accountLabel(session.user.name, session.user.email) || null);
  return (
    <Suspense fallback={<ExploreLoading />}>
      <CourseCodeExplorer
        initialData={payload.courses}
        codeLabels={payload.codeLabels}
        accountLine={accountLine}
      />
    </Suspense>
  );
}
