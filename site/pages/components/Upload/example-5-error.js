/**
 * cn -
 *    -- 图片尺寸校验，本例为 100px * 100px
 * en -
 */
import React from 'react'
import { Upload } from 'shineout'

export default function () {
  return (
    <Upload.Image
      action="http://jsonplaceholder.typicode.com/posts"
      accept="image/*"
      name="file"
      onUpload={(res, file) => file.name}
      validator={{
        imageSize: img => ((img.width !== 100 || img.height !== 100) ? new Error('only allow 100px * 100px') : undefined),
      }}
    />
  )
}
