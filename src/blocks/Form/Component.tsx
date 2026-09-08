'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { useRouter } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

import { fields } from './fields'
import { getClientSideURL } from '@/lib/getURL'
import { cn } from '@/lib/ui'

export type FormBlockType = {
  blockName?: string
  blockType?: 'formBlock'
  enableIntro: boolean
  form: FormType
  introContent?: DefaultTypedEditorState
  /** Set when rendered inside a Section slot, which supplies its own container. */
  disableInnerContainer?: boolean
}

export const FormBlock: React.FC<
  {
    id?: string
  } & FormBlockType
> = (props) => {
  const {
    enableIntro,
    form: formFromProps,
    form: { id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {},
    introContent,
    disableInnerContainer,
  } = props

  const formMethods = useForm({
    defaultValues: formFromProps.fields,
  })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods

  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>()
  const [error, setError] = useState<string | undefined>()
  const router = useRouter()

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      let loadingTimerID: ReturnType<typeof setTimeout>
      const submitForm = async () => {
        setError(undefined)

        const dataToSend = Object.entries(data).map(([name, value]) => ({
          field: name,
          value,
        }))

        // Only show the loading state if the request takes a while.
        loadingTimerID = setTimeout(() => {
          setIsLoading(true)
        }, 1000)

        try {
          const req = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body: JSON.stringify({
              form: formID,
              submissionData: dataToSend,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
          })

          const res = (await req.json()) as { errors?: { message?: string }[] }

          clearTimeout(loadingTimerID)

          if (req.status >= 400) {
            setIsLoading(false)
            setError(res.errors?.[0]?.message || "We couldn't send your message. Please try again.")
            return
          }

          setIsLoading(false)
          setHasSubmitted(true)

          if (confirmationType === 'redirect' && redirect?.url) {
            router.push(redirect.url)
          }
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError("We couldn't send your message. Please try again.")
        }
      }

      void submitForm()
    },
    [router, formID, redirect, confirmationType],
  )

  return (
    <div className={cn(!disableInnerContainer && 'container lg:max-w-[48rem]')}>
      {enableIntro && introContent && !hasSubmitted && (
        <RichText
          className="mb-8 prose-h2:text-title prose-h3:text-subtitle prose-p:text-muted-foreground"
          data={introContent}
          enableGutter={false}
        />
      )}
      <div className="surface p-5 md:p-8">
        <FormProvider {...formMethods}>
          {!isLoading && hasSubmitted && confirmationType === 'message' && (
            <div role="status">
              <RichText data={confirmationMessage} enableGutter={false} />
            </div>
          )}
          {isLoading && !hasSubmitted && (
            <p className="text-muted-foreground" role="status">
              Sending…
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-md border border-error bg-error/15 px-4 py-3 text-sm" role="alert">
              {error}
            </p>
          )}
          {!hasSubmitted && (
            <form id={formID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
              {formFromProps?.fields?.map((field, index) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const Field: React.FC<any> = fields?.[field.blockType as keyof typeof fields]
                if (!Field) return null
                return (
                  <Field
                    key={index}
                    form={formFromProps}
                    {...field}
                    {...formMethods}
                    control={control}
                    errors={errors}
                    register={register}
                  />
                )
              })}

              <div>
                <Button form={formID} type="submit" size="lg">
                  {submitButtonLabel}
                </Button>
              </div>
            </form>
          )}
        </FormProvider>
      </div>
    </div>
  )
}
