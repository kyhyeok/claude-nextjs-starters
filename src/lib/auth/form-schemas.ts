import { z } from 'zod'

/**
 * 인증 관련 폼 Zod 스키마.
 * 클라이언트/서버 양쪽에서 import 가능.
 *
 * 백엔드 검증 규칙과 *완전히 동일하게* 맞출 필요는 없습니다 — 클라 검증은 UX,
 * 서버 검증은 단일 진실 원천. 다만 합의된 핵심 규칙은 일치시키세요.
 */

const emailSchema = z
  .string()
  .min(1, '이메일을 입력해 주세요.')
  .email('올바른 이메일 주소를 입력해 주세요.')

const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .max(72, '비밀번호는 72자 이하여야 합니다.')

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

export const signupFormSchema = z
  .object({
    name: z
      .string()
      .min(2, '이름은 최소 2자 이상이어야 합니다.')
      .max(50, '이름은 최대 50자까지 입력 가능합니다.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z
      .boolean()
      .refine(v => v === true, { message: '이용약관에 동의해 주세요.' }),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupFormSchema>
