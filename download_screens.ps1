$assetsDir = "stitch_assets"
if (!(Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir }

$items = @(
    @{
        name = "04bb650557da456798872710997e525c_reset_password_v2"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1VXg_XcKwAaMqpTI3jok0QfU9qmBTErWzIkwkRb5w4Q_VT8GtG2GFQC5sdqXn93--QIIcR-GI9LPWcJZF9ZYycscODjicZxlaM9EssKX0HFB67uZSW-A0W2pnmNfuMorVRdwwA2Le8IXBrEvwfkt46PnaT_z4tkCpt4N4n1qFzMrbv29uS7GMDeiM6UdLY-bcKPmQFVNvV5lNTZF70VgbiznAMVwdl1Alf0wHaaO3sG-EO7lYs49Kpe5-Y"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMWUyNTYzY2UwNzc5YTQyNTJlMDlmOGQyEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    },
    @{
        name = "31c16eabd97c41db8993991f902ed1a4_forgot_password_v2"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1Wqlamd-C3wweX2mfoZT6gKCZ65db-VyiFgJ7XOp1VCONmrAXgA4VkZQyApanCPbDGi2H0lOvsLTCYslRvnHvFe_CCFN0uiJcgMwHK44vFYijVHkW48krdC5aVltEnbSiRrk1nn8D8qVdtXvpgNcuXQn83iWN87ceBmrpoKbQzf329QVOG_L4nuHV7Vzu8VUTywv6VoFE4zZ394MReecIsogb1jy-BWOdXQwvrU3h5majpUyv7e1xfZU5o"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMWRmNjU5ZDEwOTM0ZDk0YmE2M2EyYWNjEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    },
    @{
        name = "3bae953857114eb3a395003be340e480_sign_up"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1Uo33nkWlLJzbpwVy1y_sXxcu4ZDAyDMMt9KMo4Fv2tZUNZ_o2ZFAPkOeo3bN-YQhl4G09a-PZ5Z49S-Rg08kdp6qkRF0Iv4ZooLvQRRqgMfLowcq8MjlPuxc6V8kzmFGcrV4aPGoRqgmKIG5FE0pCB9LwHuw3oMqjDBJqVEyX-B1YOffQHbzGe5FDHiDmOUDjjadcjk69fyGbBMwG7D6tu_ruoTTkFAqM_qGiW-cSUYlDNXYrCm95Ncvs"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMWU2OTk5ZDIwOTM0Zjc0Y2IwMzA1NzBlEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    },
    @{
        name = "4ea090adaefd4f96af87a92579bae263_login"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1XRhFKC1Yy3C1OpF0zZT8ptfXO_dpa-mFkB88BDXSkG0zybKA55CxLrd6RWYxYlD80mHYT2NSC9oXfRU1u7Xf65nyWYdjl6esR_dLMd6wY2yrO3olhVKmq80AV78Drlng8bfkH2HdSiDf4BW43WY39P2Zlju0SZvg_FoPhm1vjiAO1hvrbYJMUtNEqnwi-PC0QhbrhXSPe1x4-fNE89xrN9K4sMhVyvBpv-xEEGHTFeKLNTz2z9RsVdz40"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMWUxZThiMDkwMjJkN2VlMjMxMDZmNGUyEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    },
    @{
        name = "9964347ef5e7429282e4735b65474345_dashboard_v2"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1V4lSewQGuksY9bVyv9_n7acMNZkqj1XpZu-5F9MewWUjGkWAFHUNOLsUCZyOGzv7Cg7Dd-ryavpdYxa9koYnDDOlrySliPQSGBZYd8EZmB17MyxtGdiwb5oVmgYZzWa6F92ytkpD1fYTQD6fTkJtSqYgk9PyMWLTSAyDQBveEYpRyIjiTYlRmzZQzA3NrI_AfoE00BY7C5CsyKXsHZnksaESslcaSU3AW2HhZZ0b-9Z0Y65VynxFiApeo"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMjRkMzU0ZDAwNzc5OWZkZTY3MTM0N2E0EgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    },
    @{
        name = "a50c7e31f4ac4099b1bdff08318ec2e6_stock_management"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1UwxRDcvM5Vjqm8Qa_H2g_2UxAKI76nIcDXDulVZVW4ius4djtaiXvJHbVvYn5gi_HLo_SrjGwF2al25KbBR0mGInVwCJnLt3cDvOuqpLxNWvV_0UNvTV5021GzUrteaNSMyAoAv0cpNly5Z-QOEjKu7KVTYYAC2BtppK4OSOZUJ0zHPnBUpVYRKJjMN8tx5UMlFOKuuL93nExMeOwshntKCugXPv8H-oOtkeT3raMNWjV5Fy8NAvU_jYU"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMjU0NDRiNzQwOTEwNGY4NThhMzA5NGM0EgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    },
    @{
        name = "c5dfaf41ffe24788a6e9400d9ef7c744_otp_verification_v2"
        img = "https://lh3.googleusercontent.com/aida/AEtjO1VXFu_LSdh93JEonvm9EI0BaYxLOICtO_cfay6kiA81G2c8by3FXxvQ6WbIx6tVm_GE01W2JJht8CeJr9XhN3Umpi-ff9U_v2B_GSqGrWPf4ChJ0pHgX1p59djKBppPr6846Tt5s-Dsj_8nf9n2kfpYVNrtzG25b5YKjalUQs0U1pq4wHlNYkNrwlu9vNcb3w-2MuQ1M_Y9-q5K0CwJnhpDsYNYkUQEUOrOQqGECc_0OM7c9pLUogQf-zc"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVjMWUwNzJmYzYwOTM0ZDk0YmE2M2EyYWNjEgsSBxC4grzk6wsYAZIBIwoKcHJvamVjdF9pZBIVQhM2MDc5NzQ1ODQ4ODM0NTgyOTg5&filename=&opi=89354086"
    }
)

foreach ($item in $items) {
    $imgFile = "$assetsDir/$($item.name).png"
    $htmlFile = "$assetsDir/$($item.name).html"
    curl.exe -L $item.img -o $imgFile
    curl.exe -L $item.html -o $htmlFile
}
