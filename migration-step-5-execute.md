# Step 5: Execute Migration & Verify

## What this does
Migrates your existing messages to the new system and verifies everything worked correctly.

## SQL to Run in Supabase Dashboard

Go to: https://yzyghloeilyarukytbtv.supabase.co/project/yzyghloeilyarukytbtv/sql/new

### 1. Run the Migration

**Copy and paste this:**

```sql
-- Execute the migration
SELECT * FROM migrate_existing_messages();
```

This will show you:
- `migrated_conversations` - Number of conversations created
- `migrated_messages` - Number of messages copied
- `errors` - Any errors (should be empty)

### 2. Verify Migration Success

**Copy and paste this:**

```sql
-- Verify the migration worked
SELECT * FROM verify_migration();
```

This will show you:
- `old_message_count` - Messages in original table
- `new_message_count` - Messages in new table 
- `migration_success` - Should be `true`

### 3. Test the New System

**Copy and paste this to test functionality:**

```sql
-- Test: Get a conversation ID for one of your chats
-- Replace 'your-connection-id-here' with an actual connection ID from your system
SELECT get_conversation_by_connection_id('your-connection-id-here'::UUID);

-- Test: Check all your conversations
SELECT 
  c.id,
  c.type,
  c.participant1_id,
  c.participant2_id,
  c.last_message_at,
  (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
FROM conversations c
ORDER BY c.last_message_at DESC;

-- Test: Check your user presence (should create an entry)
SELECT update_presence('online');
SELECT * FROM user_presence WHERE user_id = auth.uid();
```

## What You Should See

✅ **Migration Results:**
- All your existing messages copied to new system
- Conversations created for each connection with messages
- No errors in migration

✅ **Verification:**
- `old_message_count` = `new_message_count` 
- `migration_success` = `true`

✅ **New System Working:**
- Conversations listed with message counts
- User presence system functional
- Functions returning data properly

## If There Are Issues

**Errors during migration:**
- Check the `errors` array in migration results
- Look for foreign key violations or data inconsistencies
- Run individual parts of the migration function manually

**Migration counts don't match:**
- Check for connection_requests with status != 'accepted'
- Verify messages table has proper connection_id references
- Look for orphaned messages (connection_ids that don't exist)

**Next Steps:**
- Your existing chat will continue working
- We'll implement the new improved chat components
- Both systems will run in parallel during transition

## Ready for Code Changes

Once migration is successful, we can:
1. Create the new optimized chat components
2. Implement single WebSocket subscription architecture  
3. Add typing indicators and presence features
4. Gradually switch users to the new system