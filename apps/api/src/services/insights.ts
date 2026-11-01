import { sql } from "drizzle-orm";
import { insightsSchema, type InsightQuery } from "@munim/contracts";
import { getDatabase } from "../db/index.js";

const dayMs = 86400000;
const indiaOffsetMs = 330 * 60000;
export async function readInsights(
  db: NonNullable<ReturnType<typeof getDatabase>>,
  businessId: string,
  query: InsightQuery,
) {
  const now = new Date();
  const days = Number(query.period);
  const indiaToday = new Date(now.getTime() + indiaOffsetMs)
    .toISOString()
    .slice(0, 10);
  const from = new Date(
    Date.parse(`${indiaToday}T00:00:00+05:30`) - (days - 1) * dayMs,
  );
  const previousFrom = new Date(from.getTime() - days * dayMs);
  const asOf = now.toISOString(),
    start = from.toISOString(),
    previousStart = previousFrom.toISOString();
  const age =
    query.age === "under7"
      ? sql`d.age_days < 7`
      : query.age === "7to29"
        ? sql`d.age_days >= 7 and d.age_days < 30`
        : query.age === "30plus"
          ? sql`d.age_days >= 30`
          : sql`true`;
  const result = await db.execute(sql`
    with balances as (
      select t.id, t.kind, t.direction, t.description, t.counterparty, t.display_text, t.amount_paise, t.occurred_at,
        coalesce(sum(s.amount_paise), 0) as paid_paise,
        greatest(0, t.amount_paise - coalesce(sum(s.amount_paise), 0)) as remaining_paise,
        greatest(0, floor(extract(epoch from (${asOf}::timestamptz - t.occurred_at)) / 86400))::integer as age_days
      from munim_transactions t
      left join munim_settlements s on s.transaction_id = t.id and s.business_id = ${businessId} and s.occurred_at <= ${asOf}::timestamptz
      where t.business_id = ${businessId} and t.occurred_at <= ${asOf}::timestamptz
      group by t.id
    ), dues as (
      select * from balances where direction in ('inflow', 'outflow') and remaining_paise > 0
    ), cash as (
      select t.kind, s.direction,
        case when s.occurred_at >= ${start}::timestamptz then 'current' else 'previous' end as period,
        sum(s.amount_paise) as amount_paise, count(*) as payment_count
      from munim_settlements s
      join munim_transactions t on t.id = s.transaction_id and t.business_id = ${businessId}
      where s.business_id = ${businessId} and t.direction <> 'transfer' and s.direction in ('inflow', 'outflow')
        and s.occurred_at >= ${previousStart}::timestamptz and s.occurred_at <= ${asOf}::timestamptz
      group by t.kind, s.direction, period
    ), filtered as (
      select * from dues d where d.direction = ${query.direction} and ${age}
    ), bounds as (
      select count(*) as total, least(${query.page}::bigint, greatest(0, (count(*) - 1) / 20)) as page from filtered
    )
    select json_build_object(
      'asOf', ${asOf}::text,
      'ledgerEntryCount', (select count(*) from balances),
      'period', json_build_object('days', ${days}::integer, 'from', ${start}::text, 'to', ${asOf}::text, 'previousFrom', ${previousStart}::text, 'previousTo', ${start}::text),
      'activity', (select json_build_object(
        'current', json_build_object(
          'receivedPaise', coalesce(sum(amount_paise) filter (where period = 'current' and direction = 'inflow'), 0),
          'paidPaise', coalesce(sum(amount_paise) filter (where period = 'current' and direction = 'outflow'), 0),
          'paymentCount', coalesce(sum(payment_count) filter (where period = 'current'), 0)),
        'previous', json_build_object(
          'receivedPaise', coalesce(sum(amount_paise) filter (where period = 'previous' and direction = 'inflow'), 0),
          'paidPaise', coalesce(sum(amount_paise) filter (where period = 'previous' and direction = 'outflow'), 0),
          'paymentCount', coalesce(sum(payment_count) filter (where period = 'previous'), 0))) from cash),
      'outflows', coalesce((select json_agg(json_build_object('kind', kind, 'amountPaise', amount_paise, 'paymentCount', payment_count) order by amount_paise desc)
        from cash where period = 'current' and direction = 'outflow'), '[]'::json),
      'outstanding', (select json_build_object(
        'receivePaise', coalesce(sum(remaining_paise) filter (where direction = 'inflow'), 0),
        'payPaise', coalesce(sum(remaining_paise) filter (where direction = 'outflow'), 0),
        'receiveCount', count(*) filter (where direction = 'inflow'),
        'payCount', count(*) filter (where direction = 'outflow'),
        'aging', (select json_agg(json_build_object('bucket', b.bucket,
          'receivePaise', (select coalesce(sum(remaining_paise), 0) from dues where direction = 'inflow' and age_days >= b.minimum and age_days < b.maximum),
          'payPaise', (select coalesce(sum(remaining_paise), 0) from dues where direction = 'outflow' and age_days >= b.minimum and age_days < b.maximum)) order by b.minimum)
          from (values ('under7', 0, 7), ('7to29', 7, 30), ('30plus', 30, 2147483647)) as b(bucket, minimum, maximum))) from dues),
      'entries', json_build_object('total', (select total from bounds), 'page', (select page from bounds), 'pageSize', 20,
        'items', coalesce((select json_agg(json_build_object('id', f.id, 'kind', f.kind, 'direction', f.direction,
          'description', f.description, 'counterparty', f.counterparty, 'displayText', f.display_text, 'amountPaise', f.amount_paise,
          'paidPaise', f.paid_paise, 'remainingPaise', f.remaining_paise, 'occurredAt', f.occurred_at, 'ageDays', f.age_days)
          order by f.remaining_paise desc, f.occurred_at, f.id)
          from (select * from filtered order by remaining_paise desc, occurred_at, id limit 20 offset (select page * 20 from bounds)) f), '[]'::json))
    ) as insights
  `);
  const [row] = result.rows;
  return insightsSchema.parse(row?.insights);
}
