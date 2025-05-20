-- Enable RLS on the Prisma migrations table
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations without authentication
CREATE POLICY "Allow Prisma Migrations Access" 
ON "public"."_prisma_migrations" 
FOR ALL 
USING (true) 
WITH CHECK (true);

     -- For CompletedPayment table
     ALTER TABLE "public"."CompletedPayment" ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Allow Anonymous Access" 
     ON "public"."CompletedPayment" 
     FOR ALL USING (true) WITH CHECK (true);
     
     -- For _prisma_migrations table
     ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Allow Prisma Migrations Access" 
     ON "public"."_prisma_migrations" 
     FOR ALL USING (true) WITH CHECK (true);