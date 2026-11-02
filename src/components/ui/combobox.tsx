'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { Button } from './button'
import type { SortableKeys, DefaultValueOption } from './comboboxTypes'
import { ComboBoxList } from './comboboxList'
import type { ComboboxTranslations } from '../../types/translation'

interface ComboBoxBaseProps extends React.PropsWithChildren {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'icon'
  /**
   * Focuses the trigger on mount. It only moves focus to the button - the
   * popover stays closed until the trigger is clicked or its Enter/Space is
   * pressed, the same as any other way in.
   *
   * The trigger also rings on plain `:focus` while it is set. Focus taken on
   * mount is not `:focus-visible` to a browser that saw the mouse open the
   * dialog, so the button's own ring never shows and the form looks like it
   * has nothing focused - even though Enter opens the popover.
   */
  autoFocus?: boolean
  /**
   * Lets the list grow to the room between the trigger and the viewport edge
   * instead of stopping at 300px, or on a narrow screen to the height of the
   * drawer. Meant for short, fixed lists that should show in full - it still
   * scrolls once the viewport runs out.
   */
  fitToViewport?: boolean
  onOpenChange?: (isOpen: boolean) => void
  placeholder?: string
  validation?: boolean
  selectedOptions: DefaultValueOption[]
  onSelect: (option: DefaultValueOption) => void
  className?: string
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | null | undefined
  closeOnSelect?: boolean
  max?: number
  sortOrder?: SortableKeys
  modal?: boolean
  minSearchChars?: number
  translationStrings?: ComboboxTranslations
}

interface ComboBoxControlledProps extends ComboBoxBaseProps {
  options: DefaultValueOption[]
  fetch?: never
  fetchDebounce?: never
  translationStrings?: ComboboxTranslations
}

interface ComboBoxUncontrolledProps extends ComboBoxBaseProps {
  options?: never
  fetch: (query: string) => Promise<DefaultValueOption[]>
  fetchDebounce?: number
  translationStrings?: ComboboxTranslations
}

type ComboBoxProps = ComboBoxControlledProps | ComboBoxUncontrolledProps
export type { DefaultValueOption }

/**
 * The ring `buttonVariants` gives a `:focus-visible` trigger, on plain
 * `:focus` - see `autoFocus`. The tokens are kept the same so an autofocused
 * trigger looks no different from one the editor tabbed to.
 */
const focusRing = 'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

export function ComboBox({
  size = 'default',
  variant,
  autoFocus,
  fitToViewport = false,
  onOpenChange,
  options,
  placeholder,
  validation,
  onSelect,
  selectedOptions,
  className,
  children,
  closeOnSelect = false,
  sortOrder,
  max,
  modal = false,
  fetch,
  fetchDebounce,
  minSearchChars,
  translationStrings
}: ComboBoxProps): React.JSX.Element {
  const [selected, setSelectedOptions] = useState<DefaultValueOption[]>(selectedOptions)

  useEffect(() => {
    setSelectedOptions(selectedOptions)
  }, [selectedOptions])

  const [open, setOpen] = useState(false)
  const [_options, setOptions] = useState(options || [])
  const [loadingAsync, setloadingAsync] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const maxSelectedValues = useMemo(() => {
    return (!max || max < 0) ? 0 : max
  }, [max])

  const selectedValues = selected.map((sel) => sel.label)
  const optionsSort = (a: DefaultValueOption, b: DefaultValueOption, sortOrder: SortableKeys): number => {
    // Default sort first by selected/not selected, second by label
    const aSelected = selectedValues.includes(a.label)
    const bSelected = selectedValues.includes(b.label)
    if (aSelected && !bSelected) {
      return -1
    }
    if (!aSelected && bSelected) {
      return 1
    }
    return a[sortOrder].localeCompare(b[sortOrder])
  }

  const handleOpenChange = (isOpen: boolean): void => {
    if (isOpen && options) {
      const sortedOptions = sortOrder
        ? options.sort((a, b) =>
            optionsSort(a, b, sortOrder))
        : options

      setOptions(sortedOptions)
    }

    if (onOpenChange) {
      onOpenChange(isOpen)
    }

    setOpen(isOpen)
  }
  const triggerLabel = selected.length > 1
    ? `${selected[0].label} +${selected.length - 1}`
    : selected.length ? selected[0].label : undefined

  const handleSelect = (clickedOption: DefaultValueOption): void => {
    const clickedIsAlreadySelected = selected.find((selOption) => selOption.value === clickedOption.value)

    if (clickedIsAlreadySelected) {
      setSelectedOptions(selected.filter((selOption) => selOption.label !== clickedOption.label))
    }

    if (!clickedIsAlreadySelected) {
      if (maxSelectedValues === 1) {
        setSelectedOptions([clickedOption])
      } else if (!maxSelectedValues || selected.length < maxSelectedValues) {
        setSelectedOptions([...selected, clickedOption])
      } else {
        return
      }
    }

    onSelect(clickedOption)

    if (maxSelectedValues === 1) {
      setOpen(false)
    }
  }

  const fetchAsyncData = useCallback(async (query: string) => {
    /* v8 ignore start -- defensive: callback only passed down when `fetch` is set */
    if (!fetch) {
      return
    }
    /* v8 ignore stop */
    setloadingAsync(true)
    setOptions(await fetch(query))
    setloadingAsync(false)
  }, [fetch])

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange} modal={modal}>
        <PopoverTrigger
          render={(
            <Button
              size={size}
              autoFocus={autoFocus}
              variant={variant || 'outline'}
              data-ele-placeholder={children || triggerLabel ? undefined : 'true'}
              data-ele-validation={validation ? 'true' : undefined}
              className={cn(
                'w-fit font-sans font-normal whitespace-nowrap p-2',
                autoFocus && focusRing,
                className
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                }
              }}
            >
              {children || (triggerLabel
                ? <span className='truncate'>{triggerLabel}</span>
                : (
                    <span
                      className='text-muted-foreground truncate'
                      data-ele-placeholder='true'
                      data-ele-validation={validation ? 'true' : undefined}
                    >
                      {placeholder || ''}
                    </span>
                  ))}
            </Button>
          )}
        />
        <PopoverContent
          className={cn(
            'min-w-[200px] w-fit p-0 max-w-[400px]',
            fitToViewport && 'flex flex-col max-h-(--available-height)'
          )}
          align='start'
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <ComboBoxList
            options={_options}
            selectedOptions={selected}
            setOpen={handleOpenChange}
            onSelect={(clickedOption) => handleSelect(clickedOption)}
            label={triggerLabel}
            closeOnSelect={closeOnSelect}
            fitToViewport={fitToViewport}
            fetchAsyncData={fetch
              ? fetchAsyncData
              : undefined}
            fetchDebounce={fetchDebounce}
            loadingAsync={loadingAsync}
            minSearchChars={minSearchChars}
            setOptions={setOptions}
            translationStrings={translationStrings}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant='outline'
          autoFocus={autoFocus}
          className={cn(
            'justify-start px-2 font-sans font-normal whitespace-nowrap text-ellipsis',
            autoFocus && focusRing
          )}
        >
          {children || (triggerLabel ? <>{triggerLabel}</> : <>{placeholder}</>)}
        </Button>
      </DrawerTrigger>
      {/* The drawer has no height cap of its own; held below its `mt-24` so the list scrolls */}
      <DrawerContent className={cn(fitToViewport && 'max-h-[calc(100dvh-6rem)]')}>
        {/* TODO: take this label as a prop, or say here why it stays hardcoded */}
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <DrawerTitle className='sr-only'>Välj alternativ</DrawerTitle>
        <div className={cn('mt-4 border-t', fitToViewport && 'flex min-h-0 flex-col')}>
          <ComboBoxList
            options={_options}
            selectedOptions={selected}
            setOpen={handleOpenChange}
            onSelect={(clickedOption) => handleSelect(clickedOption)}
            label={triggerLabel}
            closeOnSelect={closeOnSelect}
            fitToViewport={fitToViewport}
            fetchAsyncData={fetch
              ? fetchAsyncData
              : undefined}
            fetchDebounce={fetchDebounce}
            loadingAsync={loadingAsync}
            minSearchChars={minSearchChars}
            setOptions={setOptions}
            translationStrings={translationStrings}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
