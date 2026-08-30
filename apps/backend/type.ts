import  {z}  from 'zod';

export const ParseInterview = z.object({
  github: z.string().url(),
});