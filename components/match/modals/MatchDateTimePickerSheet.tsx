import { Button } from '@/components/ui/Button'
import DateTimePicker from '@react-native-community/datetimepicker'
import React from 'react'
import { Platform, View } from 'react-native'

interface MatchDateTimePickerSheetProps {
  showDatePicker: boolean
  showTimePicker: boolean
  propDate: Date
  propTime: Date
  setPropDate: (date: Date) => void
  setPropTime: (date: Date) => void
  setShowDatePicker: (value: boolean) => void
  setShowTimePicker: (value: boolean) => void
}

export function MatchDateTimePickerSheet({
  showDatePicker,
  showTimePicker,
  propDate,
  propTime,
  setPropDate,
  setPropTime,
  setShowDatePicker,
  setShowTimePicker,
}: MatchDateTimePickerSheetProps) {
  if (!showDatePicker && !showTimePicker) return null

  if (Platform.OS === 'ios') {
    return (
      <View className='absolute bottom-0 w-full rounded-t-2xl border-t border-border bg-card p-4 shadow-lg z-50'>
        <DateTimePicker
          value={showDatePicker ? propDate : propTime}
          mode={showDatePicker ? 'date' : 'time'}
          display='spinner'
          onChange={(_e, d) => {
            if (!d) return
            if (showDatePicker) setPropDate(d)
            else setPropTime(d)
          }}
          themeVariant='dark'
        />

        <Button
          title='Listo'
          variant='primary'
          onPress={() => {
            setShowDatePicker(false)
            setShowTimePicker(false)
          }}
          className='mt-4'
        />
      </View>
    )
  }

  return (
    <DateTimePicker
      value={showDatePicker ? propDate : propTime}
      mode={showDatePicker ? 'date' : 'time'}
      onChange={(_e, d) => {
        setShowDatePicker(false)
        setShowTimePicker(false)
        if (!d) return
        if (showDatePicker) setPropDate(d)
        else setPropTime(d)
      }}
    />
  )
}
