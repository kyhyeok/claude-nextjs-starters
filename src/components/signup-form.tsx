'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useSignup } from '@/lib/auth/use-auth'
import {
  signupFormSchema,
  type SignupFormValues,
} from '@/lib/auth/form-schemas'
import { applyApiErrorToForm } from '@/lib/forms/api-error-to-form'

/**
 * 회원가입 폼 — 새 baseline 표준 패턴 예시.
 *
 * 백엔드가 회원가입 성공 시 *자동 로그인 토큰을 발급한다고 가정*합니다.
 * (별도 로그인이 필요한 백엔드라면 onSuccess에서 router.push('/login')로 변경)
 */
export function SignupForm() {
  const router = useRouter()

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    mode: 'onBlur',
  })

  const { mutate: signup, isPending } = useSignup()

  const onSubmit = (values: SignupFormValues) => {
    signup(
      { email: values.email, password: values.password, name: values.name },
      {
        onSuccess: () => {
          toast.success('회원가입이 완료되었습니다')
          router.replace('/')
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
        <CardTitle className="text-2xl">회원가입</CardTitle>
        <CardDescription>새 계정을 만들어 서비스를 시작하세요</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder="홍길동"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="email@example.com"
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
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="grid gap-1.5 leading-none">
                    <FormLabel className="cursor-pointer text-sm font-medium">
                      이용약관에 동의합니다
                    </FormLabel>
                    <FormDescription className="text-xs">
                      서비스 이용약관 및 개인정보 처리방침에 동의합니다.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '회원가입'
              )}
            </Button>
            <div className="text-center text-sm">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
