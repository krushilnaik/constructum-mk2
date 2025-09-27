drop extension if exists "pg_net";

drop trigger if exists "trg_enforce_task_hierarchy_rules" on "public"."tasks";

drop policy "Users can create dependencies for their tasks" on "public"."task_dependencies";

drop policy "Users can delete dependencies for their tasks" on "public"."task_dependencies";

drop policy "Users can update dependencies for their tasks" on "public"."task_dependencies";

drop policy "Users can view dependencies for their tasks" on "public"."task_dependencies";

alter table "public"."task_dependencies" drop constraint "task_dependencies_from_task_id_fkey";

alter table "public"."task_dependencies" drop constraint "task_dependencies_from_task_id_to_task_id_key";

alter table "public"."task_dependencies" drop constraint "task_dependencies_to_task_id_fkey";

drop function if exists "public"."update_task_sort_orders"(task_updates jsonb);

drop view if exists "public"."v_tasks_with_parent";

drop index if exists "public"."task_dependencies_from_task_id_to_task_id_key";

alter table "public"."tasks" alter column "task_type" drop default;

alter type "public"."task_hierarchy_type" rename to "task_hierarchy_type__old_version_to_be_dropped";

create type "public"."task_hierarchy_type" as enum ('summary', 'sub_summary', 'task');

alter table "public"."tasks" alter column task_type type "public"."task_hierarchy_type" using task_type::text::"public"."task_hierarchy_type";

alter table "public"."tasks" alter column "task_type" set default null;

drop type "public"."task_hierarchy_type__old_version_to_be_dropped";

alter table "public"."task_dependencies" drop column "from_task_id";

alter table "public"."task_dependencies" drop column "to_task_id";

alter table "public"."task_dependencies" add column "predecessor_task_id" uuid not null;

alter table "public"."task_dependencies" add column "successor_task_id" uuid not null;

alter table "public"."task_dependencies" alter column "dependency_type" drop default;

alter table "public"."tasks" alter column "task_type" set default 'task'::task_hierarchy_type;

CREATE UNIQUE INDEX task_dependencies_predecessor_task_id_successor_task_id_key ON public.task_dependencies USING btree (predecessor_task_id, successor_task_id);

alter table "public"."task_dependencies" add constraint "task_dependencies_predecessor_task_id_successor_task_id_key" UNIQUE using index "task_dependencies_predecessor_task_id_successor_task_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.prevent_circular_parent_reference()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A task cannot be its own parent';
  END IF;
  RETURN NEW;
END;
$function$
;

create or replace view "public"."v_tasks_with_parent" as  SELECT t.id,
    t.project_id,
    t.name,
    t.description,
    t.duration_days,
    t.start_date,
    t.end_date,
    t.depends_on,
    t.crew_size,
    t.progress,
    t.is_critical,
    t.color,
    t.created_at,
    t.updated_at,
    t.task_type,
    t.parent_id,
    p.task_type AS parent_type
   FROM (tasks t
     LEFT JOIN tasks p ON ((p.id = t.parent_id)));



  create policy "Users can create dependencies in their projects"
  on "public"."task_dependencies"
  as permissive
  for insert
  to public
with check (((predecessor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid()))) AND (successor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid())))));



  create policy "Users can delete dependencies in their projects"
  on "public"."task_dependencies"
  as permissive
  for delete
  to public
using (((predecessor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid()))) AND (successor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid())))));



  create policy "Users can update dependencies in their projects"
  on "public"."task_dependencies"
  as permissive
  for update
  to public
using (((predecessor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid()))) AND (successor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid())))));



  create policy "Users can view dependencies in their projects"
  on "public"."task_dependencies"
  as permissive
  for select
  to public
using (((predecessor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid()))) OR (successor_task_id IN ( SELECT t.id
   FROM (tasks t
     JOIN projects p ON ((t.project_id = p.id)))
  WHERE (p.owner_id = auth.uid())))));


CREATE TRIGGER prevent_circular_parent_reference_trigger BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION prevent_circular_parent_reference();

CREATE TRIGGER trg_enforce_task_hierarchy_rules BEFORE INSERT OR UPDATE OF parent_id, project_id, task_type ON public.tasks FOR EACH ROW EXECUTE FUNCTION enforce_task_hierarchy_rules();


