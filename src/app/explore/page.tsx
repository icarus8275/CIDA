import { Suspense } from "react";
import { auth } from "@/auth";
import { CourseCodeExplorer } from "@/components/course-code-explorer";
import { getExploreData } from "@/lib/explore-data";
import { accountLabel } from "@/lib/user-display";
import { ExploreLoading } from "./explore-loading";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const session = await auth();
  const data =
    session?.user != null
      ? await getExploreData(session.user.id, session.user.role)
      : [];
  const accountLine =
    session?.user &&
    (accountLabel(session.user.name, session.user.email) || null);
  return (
    <Suspense fallback={<ExploreLoading />}>
      <CourseCodeExplorer
        initialData={data}
        accountLine={accountLine}
      />
    </Suspense>
  );
}
