import type { SupabaseClient } from '@supabase/supabase-js';
import type { Room } from '../types';

const TABLE_NAME = 'landlord_backup';

export async function loadRoomsFromSupabase(client: SupabaseClient, userId: string): Promise<Room[]> {
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.data) ? data.data : [];
}

export async function saveRoomsToSupabase(
  client: SupabaseClient,
  userId: string,
  rooms: Room[]
): Promise<void> {
  const { error } = await client.from(TABLE_NAME).upsert(
    {
      user_id: userId,
      data: rooms,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}
