type QueryClient = {
  from: (table: string) => {
    select: (query: string) => unknown;
  };
};

export type PagedResponseRow = {
  respondent_id: string;
  item_id: string;
  score: number | null;
  answered_at: string | null;
};

const RESPONSE_PAGE_SIZE = 1000;

export async function loadPagedResponsesByRespondentIds(
  reader: QueryClient,
  respondentIds: string[]
) {
  const responses: PagedResponseRow[] = [];
  let from = 0;

  while (true) {
    const responsesQuery = reader
      .from("responses")
      .select("respondent_id, item_id, score, answered_at") as {
      in: (
        column: string,
        values: string[]
      ) => {
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => {
          order: (
            column: string,
            options?: { ascending?: boolean }
          ) => {
            range: (
              from: number,
              to: number
            ) => Promise<{
              data: PagedResponseRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };

    const { data: pageData, error } = (await responsesQuery
      .in("respondent_id", respondentIds)
      .order("respondent_id", { ascending: true })
      .order("item_id", { ascending: true })
      .range(from, from + RESPONSE_PAGE_SIZE - 1)) as {
      data: PagedResponseRow[] | null;
      error: { message: string } | null;
    };

    if (error) {
      throw new Error(error.message);
    }

    const page = (pageData ?? []) as PagedResponseRow[];
    responses.push(...page);

    if (page.length < RESPONSE_PAGE_SIZE) {
      break;
    }

    from += RESPONSE_PAGE_SIZE;
  }

  return responses;
}
