


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."task_hierarchy_type" AS ENUM (
    'summary',
    'sub_summary',
    'task'
);


ALTER TYPE "public"."task_hierarchy_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_task_hierarchy_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  parent_task RECORD;
BEGIN
  -- If no parent is set, allow both summary and regular tasks
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- If parent is set, it must exist
  SELECT id, project_id, task_type INTO parent_task FROM public.tasks WHERE id = NEW.parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent task % not found', NEW.parent_id;
  END IF;

  -- Parent must be in same project
  IF parent_task.project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Parent task must belong to the same project';
  END IF;

  -- Regular tasks can only have summary task parents
  IF NEW.task_type = 'task' AND parent_task.task_type <> 'summary' THEN
    RAISE EXCEPTION 'Regular tasks can only have summary task parents';
  END IF;

  -- Summary tasks can only have summary task parents (nested summaries allowed)
  IF NEW.task_type = 'summary' AND parent_task.task_type <> 'summary' THEN
    RAISE EXCEPTION 'Summary tasks can only have summary task parents';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_task_hierarchy_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tasks_with_parent"("project_filter_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "project_id" "uuid", "name" "text", "description" "text", "duration_days" integer, "start_date" "date", "end_date" "date", "depends_on" "uuid"[], "crew_size" integer, "progress" integer, "is_critical" boolean, "color" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "task_type" "public"."task_hierarchy_type", "parent_id" "uuid", "parent_type" "public"."task_hierarchy_type")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT 
    t.id,
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
    p.task_type as parent_type
  FROM public.tasks t
  LEFT JOIN public.tasks p ON t.parent_id = p.id
  WHERE 
    (project_filter_id IS NULL OR t.project_id = project_filter_id)
    AND EXISTS (
      SELECT 1 FROM public.projects pr 
      WHERE pr.id = t.project_id 
      AND pr.owner_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."get_tasks_with_parent"("project_filter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_circular_parent_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A task cannot be its own parent';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_circular_parent_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_user_id_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id field';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_user_id_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "owner_id" "uuid" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "availability" integer DEFAULT 100,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "predecessor_task_id" "uuid" NOT NULL,
    "successor_task_id" "uuid" NOT NULL,
    "dependency_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_dependencies_dependency_type_check" CHECK (("dependency_type" = ANY (ARRAY['FS'::"text", 'SS'::"text", 'FF'::"text", 'SF'::"text"])))
);


ALTER TABLE "public"."task_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "allocation" integer DEFAULT 100,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text",
    "description" "text",
    "duration_days" integer DEFAULT 1 NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "depends_on" "uuid"[] DEFAULT '{}'::"uuid"[],
    "crew_size" integer DEFAULT 1,
    "progress" integer DEFAULT 0,
    "is_critical" boolean DEFAULT false,
    "color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "task_type" "public"."task_hierarchy_type" DEFAULT 'task'::"public"."task_hierarchy_type" NOT NULL,
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0,
    CONSTRAINT "tasks_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."todo_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."todo_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_tasks_with_parent" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."project_id",
    "t"."name",
    "t"."description",
    "t"."duration_days",
    "t"."start_date",
    "t"."end_date",
    "t"."depends_on",
    "t"."crew_size",
    "t"."progress",
    "t"."is_critical",
    "t"."color",
    "t"."created_at",
    "t"."updated_at",
    "t"."task_type",
    "t"."parent_id",
    "p"."task_type" AS "parent_type"
   FROM ("public"."tasks" "t"
     LEFT JOIN "public"."tasks" "p" ON (("p"."id" = "t"."parent_id")));


ALTER VIEW "public"."v_tasks_with_parent" OWNER TO "postgres";


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_predecessor_task_id_successor_task_id_key" UNIQUE ("predecessor_task_id", "successor_task_id");



ALTER TABLE ONLY "public"."task_resources"
    ADD CONSTRAINT "task_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_resources"
    ADD CONSTRAINT "task_resources_task_id_resource_id_key" UNIQUE ("task_id", "resource_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."todo_items"
    ADD CONSTRAINT "todo_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "unique_user_id" UNIQUE ("user_id");



CREATE INDEX "idx_tasks_parent_id" ON "public"."tasks" USING "btree" ("parent_id");



CREATE INDEX "idx_tasks_project_parent" ON "public"."tasks" USING "btree" ("project_id", "parent_id");



CREATE INDEX "idx_tasks_task_type" ON "public"."tasks" USING "btree" ("task_type");



CREATE OR REPLACE TRIGGER "enforce_task_hierarchy" BEFORE INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_task_hierarchy_rules"();



CREATE OR REPLACE TRIGGER "prevent_circular_parent_reference_trigger" BEFORE INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_circular_parent_reference"();



CREATE OR REPLACE TRIGGER "prevent_user_id_change_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_user_id_change"();



CREATE OR REPLACE TRIGGER "trg_enforce_task_hierarchy_rules" BEFORE INSERT OR UPDATE OF "parent_id", "project_id", "task_type" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_task_hierarchy_rules"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resources_updated_at" BEFORE UPDATE ON "public"."resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_dependencies_updated_at" BEFORE UPDATE ON "public"."task_dependencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_todo_items_updated_at" BEFORE UPDATE ON "public"."todo_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_resources"
    ADD CONSTRAINT "task_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_resources"
    ADD CONSTRAINT "task_resources_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create dependencies in their projects" ON "public"."task_dependencies" FOR INSERT WITH CHECK ((("predecessor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"()))) AND ("successor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can create resources in their projects" ON "public"."resources" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "resources"."project_id"))));



CREATE POLICY "Users can create task resources in their projects" ON "public"."task_resources" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "task_resources"."task_id"))));



CREATE POLICY "Users can create tasks in their projects" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "tasks"."project_id"))));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own projects" ON "public"."projects" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can create todo items in their projects" ON "public"."todo_items" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "todo_items"."task_id"))));



CREATE POLICY "Users can delete dependencies in their projects" ON "public"."task_dependencies" FOR DELETE USING ((("predecessor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"()))) AND ("successor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete resources in their projects" ON "public"."resources" FOR DELETE USING (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "resources"."project_id"))));



CREATE POLICY "Users can delete task resources in their projects" ON "public"."task_resources" FOR DELETE USING (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "task_resources"."task_id"))));



CREATE POLICY "Users can delete tasks in their projects" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "tasks"."project_id"))));



CREATE POLICY "Users can delete their own projects" ON "public"."projects" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can delete todo items in their projects" ON "public"."todo_items" FOR DELETE USING (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "todo_items"."task_id"))));



CREATE POLICY "Users can update dependencies in their projects" ON "public"."task_dependencies" FOR UPDATE USING ((("predecessor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"()))) AND ("successor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can update resources in their projects" ON "public"."resources" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "resources"."project_id"))));



CREATE POLICY "Users can update task resources in their projects" ON "public"."task_resources" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "task_resources"."task_id"))));



CREATE POLICY "Users can update tasks in their projects" ON "public"."tasks" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "tasks"."project_id"))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own projects" ON "public"."projects" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can update todo items in their projects" ON "public"."todo_items" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "todo_items"."task_id"))));



CREATE POLICY "Users can view dependencies in their projects" ON "public"."task_dependencies" FOR SELECT USING ((("predecessor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"()))) OR ("successor_task_id" IN ( SELECT "t"."id"
   FROM ("public"."tasks" "t"
     JOIN "public"."projects" "p" ON (("t"."project_id" = "p"."id")))
  WHERE ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can view resources in their projects" ON "public"."resources" FOR SELECT USING (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "resources"."project_id"))));



CREATE POLICY "Users can view task resources in their projects" ON "public"."task_resources" FOR SELECT USING (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "task_resources"."task_id"))));



CREATE POLICY "Users can view tasks in their projects" ON "public"."tasks" FOR SELECT USING (("auth"."uid"() IN ( SELECT "projects"."owner_id"
   FROM "public"."projects"
  WHERE ("projects"."id" = "tasks"."project_id"))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own projects" ON "public"."projects" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can view todo items in their projects" ON "public"."todo_items" FOR SELECT USING (("auth"."uid"() IN ( SELECT "p"."owner_id"
   FROM ("public"."projects" "p"
     JOIN "public"."tasks" "t" ON (("p"."id" = "t"."project_id")))
  WHERE ("t"."id" = "todo_items"."task_id"))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."todo_items" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_task_hierarchy_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_task_hierarchy_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_task_hierarchy_rules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tasks_with_parent"("project_filter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tasks_with_parent"("project_filter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tasks_with_parent"("project_filter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_circular_parent_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_circular_parent_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_circular_parent_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_user_id_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_user_id_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_user_id_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."task_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."task_resources" TO "anon";
GRANT ALL ON TABLE "public"."task_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."task_resources" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."todo_items" TO "anon";
GRANT ALL ON TABLE "public"."todo_items" TO "authenticated";
GRANT ALL ON TABLE "public"."todo_items" TO "service_role";



GRANT ALL ON TABLE "public"."v_tasks_with_parent" TO "anon";
GRANT ALL ON TABLE "public"."v_tasks_with_parent" TO "authenticated";
GRANT ALL ON TABLE "public"."v_tasks_with_parent" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
