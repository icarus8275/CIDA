import { Suspense } from "react";
import { auth } from "@/auth";
import { CourseCodeExplorer } from "@/components/course-code-explorer";
import { getExploreData } from "@/lib/explore-data";
import { ExploreLoading } from "./explore-loading";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const session = await auth();
  const payload =
    session?.user != null
      ? await getExploreData()
      : { courses: [], codeLabels: {} as Record<string, string | null> };
  return (
    <Suspense fallback={<ExploreLoading />}>
      <CourseCodeExplorer
        initialData={payload.courses}
        codeLabels={payload.codeLabels}
        accountLine={null}
      />
    </Suspense>
  );
}
