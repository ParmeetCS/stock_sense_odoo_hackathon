$assetsDir = "stitch_assets"
if (!(Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir }

$items = @(
    @{
        name = "41fe57fac5c34476b1ff8988f4791844_inbound_receipts_kanban"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1VLitmEbj8jruonvEIxiyxrJIBDUV1kIfXUjxGlzhrS7RvODo6B74kcrk2PedsReYrn_9iD8GzjMkVk9m7jov9PJ0zav-2Q3zt7CXNVonEXXdd-UceivuSoANA07AAiqlwUSlI0bMq1OdqOZ1FCN9t_YI-ZbpQsWxUqJv5UNvqB0dosrZQ1BymsKhOGHacXNDkDn7uGlXgrC_gL7ozpXGLN1kivI7ucRCpQeKzGnMuWzMQ8mkA4CD739wY"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjYWJjZjdkZTgwMDMwMWZiNzFhMWE3NjRmEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhMzNzk0NDE0MjQ1NjMwNTIyODY4&filename=&opi=89354086"
    },
    @{
        name = "8e8b64b5b1f940ceb22122170d754fd5_inbound_receipts_list"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1UvZmeGlLuSGefWKYlR-3BFpuhIzQwrKp5LmRX_D-w9_FKDvlWwKp4NXmeh0nbHlQK5H3Nsax3jv6PNRLmAhpZfIPY5qVNpe5U4JTrH28TkH44RXQdeeHhps83awtQkTGbVT9i_207YWLYbhZrdDvdtskrlPyWSAvOW1cS3dNrbYPFh4XaLaDeArhpezO7LGBwt6QG1bYgmw8pZpvgzWVkYjKIaO_Oa-BNu_-rAZoJMaBNQgw86dYNLKYg"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjYWJjZjdkYzkwMDMwMWZiNzFhMWE3NjRmEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhMzNzk0NDE0MjQ1NjMwNTIyODY4&filename=&opi=89354086"
    },
    @{
        name = "ad133dad058c47979c704ba33dafdb1f_delivery_detail_wh_out_0001"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1Us2ktYHA4jxJOFA4b1NLdJeucJljtPtE3kYBQdueocXkZpKPIH7nD0_9VUQOJYFVYE1p7PJ01Vbp3t-TOB6gw6FHXJ9CJqYscsmkpNnoXIK30GNJYcw4hJA064CWexJr0U47ygHHuqWXwYg967tS2Gw5FfDfel2aje1bCSuQweNYxyQj9mA3yZt8cVBmNtZQOO32KOBXOeNP5O745ScuYniQRwL6KB0qSorwErR_JWP5pChWdYi12Ops4"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjYWJjZjdkOTIwMDMwMWZiNzFhMWE3NjRmEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhMzNzk0NDE0MjQ1NjMwNTIyODY4&filename=&opi=89354086"
    },
    @{
        name = "c5e5a74d18754f9e845b7e0d791a979b_receipt_detail_wh_in_0001"
        img = "https://lh3.googleusercontent.google.com/aida/AEtjO1U94PspLWQikdb4RWQK-1u-MgAM-TO48LEYK4zxdXITI_RH7UCAI3ujhshQwaSVbi5cZ1rAzj3GZmx3EZaZ6Gp4s8866k24exEYvpyzmnQxKYSIUsKlh7QryzfgMqw3hbvYa3dMN_HGP_cXUPCybKu6Bs9-A4z9SEYPA3DkWoUC9w3rJVaEPZaaxW78zOIlOX71F2c7lD7AiTZV-ttTpVTHumKMV_p_0jmKzSudNvB4eGLG3tP9_g1Vbw"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjYWJjZjdkZGQwMDMwMWZiNzFhMWE3NjRmEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhMzNzk0NDE0MjQ1NjMwNTIyODY4&filename=&opi=89354086"
    },
    @{
        name = "56d9a0b0ff424a7da14f3e784e2276c6_outbound_deliveries_list"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1VdsxZpUO-HtuzTfZusE4gL0fhR1dX1LW4K2m6BUVyDqEwWoZ8DG9eYyYFrOTPllycwprhL9s1VhpBW3Nbzs4hJApAdOgQ1z_O8alf7IhvxK27UcStIGqddSi_SfZNiwZtKkdlr2pGhArrCndDr_lqdYKTXagqV9TwWTRwoX0fNleXECGz_2E_LjIIIdFIZ2Klcq2d7SfJExRDcOGWImMM0bEo8dexWcMvwe2FJqExU3P5iFmGyOggZcg"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjYWJjZjdkYWMwMDMwMWZiNzFhMWE3NjRmEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhMzNzk0NDE0MjQ1NjMwNTIyODY4&filename=&opi=89354086"
    },
    @{
        name = "682764fdc94543febc5adfda45d76b67_outbound_deliveries_kanban"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1W3zZvrM1O8E1P8JZ2vTQw0vgYrZnkm6tKWPGSoN8BamJzGvIJYa4lh606hz679so6zEOp9F6oSI767BY0x7cOy3ZfUxSsthnId8p-s5FdcOTL90j0CIpwuXJlXKRxSSkEZsPdfX_TMrNUGj0KdSxfz_Qc4b9t2p9bsIuIl0dosskefV3Lyqc_Y_TbwPpiexLTZuOl5aikot2ZEAmZli3P0zhK1GgT679IfDppHxvkQaXcGeH8tSzEnaVk"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjYWJjZjdkYjcwMDMwMWZiNzFhMWE3NjRmEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhMzNzk0NDE0MjQ1NjMwNTIyODY4&filename=&opi=89354086"
    }
)

foreach ($item in $items) {
    $imgFile = "$assetsDir/$($item.name).png"
    $htmlFile = "$assetsDir/$($item.name).html"
    curl.exe -L $item.img -o $imgFile
    curl.exe -L $item.html -o $htmlFile
}
