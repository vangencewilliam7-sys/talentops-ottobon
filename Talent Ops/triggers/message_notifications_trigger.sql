
-- TRIGGER: Auto-notify on new message
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    conv_org_id UUID;
    member_record RECORD;
BEGIN
    -- 1. Get sender's name
    SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_user_id;
    IF sender_name IS NULL THEN sender_name := 'Someone'; END IF;

    -- 2. Get conversation org_id
    SELECT org_id INTO conv_org_id FROM public.conversations WHERE id = NEW.conversation_id;

    -- 3. Notify all OTHER members of the conversation
    FOR member_record IN 
        SELECT user_id FROM public.conversation_members 
        WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_user_id
    LOOP
        INSERT INTO public.notifications (
            receiver_id,
            sender_id,
            sender_name,
            message,
            type,
            is_read,
            org_id,
            created_at
        ) VALUES (
            member_record.user_id,
            NEW.sender_user_id,
            sender_name,
            NEW.content,
            'message',
            FALSE,
            conv_org_id,
            NOW()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();
