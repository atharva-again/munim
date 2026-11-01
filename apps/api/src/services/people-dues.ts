import { sql } from "drizzle-orm";
import { peopleDuesSchema, peopleDuesQuerySchema } from "@munim/contracts";
import { z } from "zod";
import { getDatabase } from "../db/index.js";

export async function readPeopleDues(db: NonNullable<ReturnType<typeof getDatabase>>, businessId: string, query: z.infer<typeof peopleDuesQuerySchema>) {
  const asOf = new Date().toISOString();
  const result = await db.execute(sql`with balances as (
    select t.id,t.counterparty,t.display_text,t.occurred_at,
      greatest(0,t.amount_paise-coalesce(sum(s.amount_paise),0)) as remaining
    from munim_transactions t left join munim_settlements s on s.transaction_id=t.id
      and s.business_id=${businessId} and s.occurred_at<=${asOf}::timestamptz
    where t.business_id=${businessId} and t.direction=${query.direction} and t.occurred_at<=${asOf}::timestamptz
    group by t.id
  ), people as (
    select counterparty,sum(remaining) as remaining,count(*)::int as entries,min(occurred_at) as oldest,
      (array_agg(display_text order by occurred_at desc,id))[1] as display_text
    from balances where remaining>0 group by counterparty
  ), bounds as (
    select count(*)::int as total,least(${query.page},greatest(0,(count(*)-1)/20))::int as page from people
  ) select json_build_object('asOf',${asOf}::text,'totalRemainingPaise',(select coalesce(sum(remaining),0) from people),'total',(select total from bounds),'page',(select page from bounds),
    'items',coalesce((select json_agg(json_build_object('counterparty',counterparty,'displayText',display_text,
      'remainingPaise',remaining,'entryCount',entries,'oldestAt',oldest) order by remaining desc,counterparty)
      from (select * from people order by remaining desc,counterparty limit 20 offset (select page*20 from bounds)) p),'[]'::json)) as result`);
  return peopleDuesSchema.parse(result.rows[0]?.result);
}
