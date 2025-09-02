-- Add 'verse' column to the questions table
ALTER TABLE public.questions
ADD COLUMN verse INTEGER NOT NULL DEFAULT 1;

-- Add a check constraint to ensure verse is positive
ALTER TABLE public.questions
ADD CONSTRAINT questions_verse_check CHECK (verse > 0);

-- Create an index for better performance when querying by verse
CREATE INDEX IF NOT EXISTS idx_questions_verse ON public.questions(verse);

-- Update existing questions to have a default verse value (if not already handled by DEFAULT)
-- This step is mostly for clarity, as the NOT NULL DEFAULT 1 handles existing rows.
UPDATE public.questions
SET verse = 1
WHERE verse IS NULL;

-- Optionally, if you want to include verse in the unique constraint for book/chapter/question
-- You would need to drop the old unique constraint first if it exists
-- ALTER TABLE public.questions
-- DROP CONSTRAINT IF EXISTS unique_question_per_chapter; -- Replace with actual constraint name if it exists

-- ALTER TABLE public.questions
-- ADD CONSTRAINT unique_question_per_verse UNIQUE (book_of_bible, chapter, verse, question);

-- Note: If you have a trigger that validates bible references, you might need to update it
-- to account for the new 'verse' column if it's part of the validation logic.
-- For now, we assume the existing trigger (validate_bible_reference_trigger) does not need modification
-- as it primarily focuses on book_of_bible.
