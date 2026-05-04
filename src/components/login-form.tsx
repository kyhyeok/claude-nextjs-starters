'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/lib/auth/use-auth'
import { loginFormSchema, type LoginFormValues } from '@/lib/auth/form-schemas'
import { applyApiErrorToForm } from '@/lib/forms/api-error-to-form'

/**
 * 로그인 폼 — 새 baseline 표준 패턴 예시.
 *
 * - RHF + Zod로 클라이언트 검증
 * - useLogin 훅이 /api/auth/login을 호출하고 ApiError로 throw
 * - applyApiErrorToForm 헬퍼가 백엔드 검증 실패를 폼 필드 에러로 매핑
 * - 매핑할 fieldErrors가 없는 경우(예: 401 잘못된 자격증명)는 toast로 폴백
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'

  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
    mode: 'onBlur',
  })

  const { mutate: login, isPending } = useLogin()

  const onSubmit = (values: LoginFormValues) => {
    login(
      { email: values.email, password: values.password },
      {
        onSuccess: () => {
          toast.success('로그인되었습니다')
          router.replace(returnTo)
          router.refresh()
        },
        onError: error => {
          const mapped = applyApiErrorToForm(error, form.setError)
          if (!mapped) toast.error(error.message)
        },
      }
    )
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">로그인</CardTitle>
        <CardDescription className="text-center">
          계정에 로그인하여 서비스를 이용하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="비밀번호를 입력하세요"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={
                          showPassword ? '비밀번호 숨기기' : '비밀번호 보기'
                        }
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer text-sm font-normal">
                    로그인 상태 유지
                  </FormLabel>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인하기'
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            아직 계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-primary underline-offset-4 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
