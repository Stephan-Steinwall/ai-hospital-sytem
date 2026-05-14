import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null | undefined;

export function getSupabaseAdminClient() {
    if (adminClient !== undefined) {
        return adminClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        adminClient = null;
        return adminClient;
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return adminClient;
}
